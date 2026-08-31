import { config } from "dotenv";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

config({ path: [".env.local", ".env"] });

// Daily gate: build and send the newest quarter's issue once it is essentially complete.
async function main() {
  const { shouldSend } = await import("../../lib/newsletter/issue");
  const { issueSlug, readIssue } = await import("../../lib/newsletter/store");
  const index = JSON.parse(readFileSync(path.join(process.cwd(), "data", "store", "index.json"), "utf8"));
  const quarter: string = index.quarters[index.quarters.length - 1];
  const total: number = index.investors.length;
  const filed: number = index.investors.filter((i: { series: { q: string }[] }) => i.series.some((s) => s.q === quarter)).length;
  const slug = issueSlug(quarter);
  if (readIssue(slug)?.manifest.sentAt) return console.log(`${slug}: already sent`);
  if (!shouldSend(quarter, filed, total)) return console.log(`${slug}: not yet (${filed}/${total} filed)`);
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_AUDIENCE_ID || !process.env.ANTHROPIC_API_KEY) return console.log(`${slug}: ready, but secrets are not configured`);
  execSync(`npx tsx scripts/newsletter/build-issue.ts "${quarter}"`, { stdio: "inherit" });
  execSync(`npx tsx scripts/newsletter/send-issue.ts ${slug}`, { stdio: "inherit" });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
