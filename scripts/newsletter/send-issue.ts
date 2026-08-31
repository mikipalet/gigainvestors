import { config } from "dotenv";
import { Resend } from "resend";

config({ path: [".env.local", ".env"] });

// Usage: tsx scripts/newsletter/send-issue.ts <slug> [--test you@example.com]
// Free tier allows 100 sends/day: recipients beyond 100 are scheduled in daily batches.
async function main() {
  const { readIssue, writeIssue } = await import("../../lib/newsletter/store");
  const slug = process.argv[2];
  const testTo = process.argv.includes("--test") ? process.argv[process.argv.indexOf("--test") + 1] : null;
  if (!slug) throw new Error("slug required");
  const found = readIssue(slug);
  if (!found) throw new Error(`no built issue ${slug}`);
  const { manifest, html } = found;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = "GigaInvestors <letters@gigainvestors.com>";

  if (testTo) {
    const r = await resend.emails.send({ from, to: testTo, subject: `[test] ${manifest.subject}`, html: html.replace("{{{RESEND_UNSUBSCRIBE_URL}}}", "https://gigainvestors.com/unsubscribe"), tags: [{ name: "issue", value: slug }] });
    console.log("test sent", r.data?.id ?? r.error);
    return;
  }
  if (manifest.sentAt) throw new Error(`${slug} already sent at ${manifest.sentAt}`);
  const audienceId = process.env.RESEND_AUDIENCE_ID!;
  const contacts = (await resend.contacts.list({ audienceId })).data?.data?.filter((c) => !c.unsubscribed) ?? [];
  const recipients = contacts.length;
  // Sending to an empty audience would mark the issue sent and it would never reach a later
  // subscriber. Leave it unsent and try again tomorrow.
  if (recipients === 0) return console.log(`${slug}: no confirmed subscribers, not sending`);

  const created = await resend.broadcasts.create({ audienceId, from, replyTo: "hello@gigainvestors.com", subject: manifest.subject, html, name: manifest.subject });
  if (!created.data) throw new Error(`broadcast create failed: ${JSON.stringify(created.error)}`);
  const broadcastId = created.data.id;
  // Under the daily cap send now; above it, Resend's scheduler spreads it (one broadcast, scheduled).
  const scheduledAt = recipients > 100 ? "in 1 min" : undefined;
  const sent = await resend.broadcasts.send(broadcastId, scheduledAt ? { scheduledAt } : undefined);
  if (sent.error) throw new Error(`broadcast send failed: ${JSON.stringify(sent.error)}`);
  writeIssue({ ...manifest, sentAt: new Date().toISOString(), broadcastId, recipients }, html);
  console.log(`sent ${slug} to ${recipients} (broadcast ${broadcastId}${scheduledAt ? ", scheduled" : ""})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
