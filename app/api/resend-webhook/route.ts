import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { redis } from "@/lib/newsletter/redis";

export const dynamic = "force-dynamic";

const COUNTED = new Set(["email.delivered", "email.opened", "email.clicked", "email.bounced", "email.complained", "contact.updated"]);

// Resend signs webhooks the Svix way: HMAC-SHA256 over `${id}.${timestamp}.${body}`.
function verify(req: NextRequest, body: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const id = req.headers.get("svix-id");
  const ts = req.headers.get("svix-timestamp");
  const sigs = req.headers.get("svix-signature");
  if (!secret || !id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest();
  return sigs.split(" ").some((s) => {
    const [, v] = s.split(",");
    if (!v) return false;
    const given = Buffer.from(v, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  if (!verify(req, body)) return NextResponse.json({ error: "bad signature" }, { status: 401 });
  const event = JSON.parse(body) as { type: string; data: { broadcast_id?: string; email_id?: string; to?: string[]; unsubscribed?: boolean; tags?: Record<string, string> } };
  if (!COUNTED.has(event.type)) return NextResponse.json({ ok: true });
  try {
    const r = await redis();
    if (event.type === "contact.updated") {
      if (event.data.unsubscribed) await r.hIncrBy("newsletter:totals", "unsubscribed", 1);
      return NextResponse.json({ ok: true });
    }
    const issue = event.data.broadcast_id ?? event.data.tags?.issue;
    if (!issue) return NextResponse.json({ ok: true });
    const field = event.type.replace("email.", "");
    const who = event.data.to?.[0] ?? event.data.email_id ?? "";
    if (field === "opened" || field === "clicked") {
      const first = await r.sAdd(`issue:${issue}:${field}:who`, who);
      if (first) await r.expire(`issue:${issue}:${field}:who`, 90 * 86400);
      if (!first) return NextResponse.json({ ok: true, dedup: true });
    }
    await r.hIncrBy(`issue:${issue}`, field, 1);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "store unavailable" }, { status: 500 });
  }
}
