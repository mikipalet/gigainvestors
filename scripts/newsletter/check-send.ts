import { config } from "dotenv";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Resend } from "resend";

config({ path: [".env.local", ".env"] });

// Usage: tsx scripts/newsletter/check-send.ts [slug]
// One command that answers "did the quarterly send actually work": the manifest, the broadcast,
// the audience, and what production is serving.
async function main() {
  const { issueSlug, listIssues, readIssue } = await import("../../lib/newsletter/store");
  const index = JSON.parse(readFileSync(path.join(process.cwd(), "data", "store", "index.json"), "utf8"));
  const slug = process.argv[2] ?? issueSlug(listIssues()[0]?.quarter ?? index.quarters[index.quarters.length - 1]);
  const manifest = readIssue(slug)?.manifest;
  const say = (ok: boolean | null, label: string, detail: string) => console.log(`${ok === null ? "?" : ok ? "ok " : "NO "} ${label.padEnd(22)} ${detail}`);

  if (!manifest) return console.log(`no built issue ${slug}`);
  say(!!manifest.sentAt, "manifest sentAt", manifest.sentAt ?? "never sent");
  say(!!manifest.recipients, "manifest recipients", String(manifest.recipients ?? 0));

  const resend = new Resend(process.env.RESEND_API_KEY);
  if (manifest.broadcastId) {
    const b = await resend.broadcasts.get(manifest.broadcastId).catch(() => null);
    say(b?.data?.status === "sent", "broadcast status", `${b?.data?.status ?? "unknown"} (${manifest.broadcastId})`);
  } else {
    say(false, "broadcast", "no broadcast id on the manifest");
  }

  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (audienceId) {
    const contacts = (await resend.contacts.list({ audienceId }).catch(() => null))?.data?.data ?? [];
    const live = contacts.filter((c) => !c.unsubscribed).length;
    say(live > 0, "audience", `${live} subscribed, ${contacts.length - live} unsubscribed`);
  }

  const stats = await fetch(`https://gigainvestors.com/api/newsletter-stats?cb=${Date.now()}`, { cache: "no-store" })
    .then((r) => r.json() as Promise<{ subscribers: number | null; issues: { quarter: string; sentAt: string | null; recipients: number | null; stats: Record<string, number> | null }[] }>)
    .catch(() => null);
  const live = stats?.issues.find((i) => i.quarter === manifest.quarter);
  say(!!live?.sentAt, "production knows", live?.sentAt ? `sent ${live.sentAt}, ${live.recipients} recipients` : "production has not rebuilt with the sent manifest");
  say(live?.stats ? Object.keys(live.stats).length > 0 : null, "open stats", live?.stats ? JSON.stringify(live.stats) : "nothing counted yet");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
