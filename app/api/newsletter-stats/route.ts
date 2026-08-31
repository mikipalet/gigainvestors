import { NextResponse } from "next/server";
import { Resend } from "resend";
import { listIssues } from "@/lib/newsletter/store";
import { redis } from "@/lib/newsletter/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const issues = listIssues();
  let subscribers: number | null = null;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (audienceId) {
      const list = await resend.contacts.list({ audienceId });
      subscribers = (list.data?.data ?? []).filter((c) => !c.unsubscribed).length;
    }
  } catch {
    subscribers = null;
  }
  const perIssue: Record<string, Record<string, number>> = {};
  let subscriberSeries: { day: string; n: number }[] = [];
  try {
    const r = await redis();
    if (subscribers !== null) {
      await r.hSet("newsletter:subs", new Date().toISOString().slice(0, 10), String(subscribers));
      const all = await r.hGetAll("newsletter:subs");
      subscriberSeries = Object.entries(all)
        .map(([day, n]) => ({ day, n: Number(n) }))
        .sort((a, b) => a.day.localeCompare(b.day))
        .slice(-90);
    }
    for (const i of issues) {
      if (!i.broadcastId) continue;
      const h = await r.hGetAll(`issue:${i.broadcastId}`);
      perIssue[i.quarter] = Object.fromEntries(Object.entries(h).map(([k, v]) => [k, Number(v)]));
    }
  } catch {
    // Stats degrade to "not yet" rather than failing the page.
  }
  return NextResponse.json(
    { subscribers, subscriberSeries, issues: issues.map((i) => ({ quarter: i.quarter, sentAt: i.sentAt ?? null, recipients: i.recipients ?? null, headline: i.headline, stats: perIssue[i.quarter] ?? null })) },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
  );
}
