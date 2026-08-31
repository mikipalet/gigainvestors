"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkline } from "@/components/Sparkline";

interface IssueRow {
  quarter: string;
  slug: string;
  headline: string;
  sentAt: string | null;
}
interface Stats {
  subscribers: number | null;
  subscriberSeries: { day: string; n: number }[];
  issues: { quarter: string; sentAt: string | null; recipients: number | null; headline: string; stats: Record<string, number> | null }[];
}

const rate = (n: number | undefined, d: number | null | undefined) => (n !== undefined && d ? Math.round((n / d) * 100) : null);

export function NewsletterClient({ issues }: { issues: IssueRow[] }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [day, setDay] = useState<number | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("confirmed")) {
      setState("sent");
      setMessage("Confirmed. The next issue goes out when the quarter\u2019s filings are in.");
    } else if (p.get("error")) {
      setState("error");
      setMessage("That link expired. Subscribe again below.");
    }
    fetch("/api/newsletter-stats").then((r) => r.json()).then(setStats).catch(() => null);
  }, []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("busy");
    const hp = (e.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
    const r = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, hp }) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setState(j?.ok ? "sent" : "error");
    setMessage(j?.message ?? "Something went wrong.");
  };

  return (
    <>
      <form onSubmit={submit} className="flex items-center gap-2">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-[3px] bg-paper px-3 py-2 text-[15px] shadow-[inset_0_0_0_1.5px_var(--ink)] outline-none placeholder:opacity-40"
        />
        <button type="submit" disabled={state === "busy"} className="shrink-0 rounded-[3px] bg-ink px-4 py-2 text-[15px] font-semibold text-paper transition-opacity hover:opacity-80 disabled:opacity-50">
          subscribe
        </button>
      </form>
      {message && <p className={`text-[13px] ${state === "error" ? "text-sell" : "text-buy"}`}>{message}</p>}

      <section className="text-[13px]">
        <div className="flex items-baseline justify-between border-b border-ink/15 pb-1">
          <span className="text-[11px] uppercase tracking-wide opacity-50">open stats</span>
          <span className="opacity-60">{stats?.subscribers !== null && stats?.subscribers !== undefined ? `${stats.subscribers} subscribers` : ""}</span>
        </div>
        {(stats?.subscriberSeries?.length ?? 0) > 1 && (
          <div className="mt-3">
            <Sparkline
              values={stats!.subscriberSeries.map((s) => s.n)}
              labels={stats!.subscriberSeries.map((s) => new Date(s.day).toLocaleDateString("en-GB", { day: "numeric", month: "short" }))}
              index={day ?? stats!.subscriberSeries.length - 1}
              caption="subscribers"
              format={(v) => String(Math.round(v))}
              onSeek={setDay}
              height="h-12"
            />
          </div>
        )}
        {issues.length === 0 && <p className="mt-3 opacity-50">No issue yet. The first goes out when the current quarter&apos;s filings are in.</p>}
        {issues.map((i) => {
          const s = stats?.issues.find((x) => x.quarter === i.quarter);
          const recipients = s?.recipients ?? null;
          const opened = rate(s?.stats?.opened, recipients);
          const clicked = rate(s?.stats?.clicked, recipients);
          return (
            <div key={i.slug} className="border-b border-ink/10 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <Link href={`/newsletter/${i.slug}`} className="font-semibold hover:opacity-70">
                  {i.quarter}
                </Link>
                <span className="text-[11px] opacity-50">{i.sentAt ? new Date(i.sentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "not sent"}</span>
              </div>
              <div className="truncate opacity-60">{i.headline}</div>
              {recipients !== null && (
                <div className="mt-2 grid grid-cols-[4.5em_1fr_3em] items-center gap-2 text-[11px]">
                  <span className="opacity-50">opened</span>
                  <div className="h-[6px] bg-ink/10">
                    <div className="h-full bg-ink" style={{ width: `${opened ?? 0}%` }} />
                  </div>
                  <span className="text-right">{opened ?? 0}%</span>
                  <span className="opacity-50">clicked</span>
                  <div className="h-[6px] bg-ink/10">
                    <div className="h-full bg-ink/60" style={{ width: `${clicked ?? 0}%` }} />
                  </div>
                  <span className="text-right">{clicked ?? 0}%</span>
                  <span className="opacity-50">sent to</span>
                  <span className="col-span-2">{recipients}</span>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}
