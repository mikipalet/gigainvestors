import { config } from "dotenv";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { render } from "@react-email/render";
import React from "react";

config({ path: [".env.local", ".env"] });

// Usage: tsx scripts/newsletter/build-issue.ts [quarter]  (defaults to the newest quarter in the index)
async function main() {
  const { buildIssue } = await import("../../lib/newsletter/issue");
  const { renderHero } = await import("../../lib/newsletter/hero");
  const { issueSlug, writeIssue, readIssue } = await import("../../lib/newsletter/store");
  const { QuarterIssue } = await import("../../emails/QuarterIssue");
  const root = path.join(process.cwd(), "data", "store");
  const index = JSON.parse(readFileSync(path.join(root, "index.json"), "utf8"));
  const quarter = process.argv[2] ?? index.quarters[index.quarters.length - 1];
  const investors: Record<string, unknown> = {};
  for (const i of index.investors) {
    const f = path.join(root, "investors", `${i.code}.json`);
    if (existsSync(f)) investors[i.code] = JSON.parse(readFileSync(f, "utf8"));
  }
  const stocks: Record<string, unknown> = {};
  for (const f of readdirSync(path.join(root, "stocks"))) Object.assign(stocks, JSON.parse(readFileSync(path.join(root, "stocks", f), "utf8")));
  const issue = buildIssue(quarter, index, investors as never, stocks as never);
  const slug = issueSlug(quarter);
  const slugsByLastName: Record<string, string> = Object.fromEntries(index.investors.map((i: { person: string; slug: string }) => [i.person.split(" ").pop(), i.slug]));
  const heroFile = path.join(process.cwd(), "public", "newsletter", `${slug}.png`);
  const hero = await renderHero(issue, slugsByLastName, heroFile);
  const html = await render(React.createElement(QuarterIssue, { issue, heroUrl: hero ? `https://gigainvestors.com/newsletter/${slug}.png` : undefined }));
  const existing = readIssue(slug)?.manifest;
  writeIssue(
    {
      quarter,
      slug,
      headline: issue.headline,
      subject: issue.subject,
      builtAt: new Date().toISOString(),
      ...(existing?.sentAt ? { sentAt: existing.sentAt, broadcastId: existing.broadcastId, recipients: existing.recipients } : {}),
    },
    html,
  );
  console.log(`built ${slug}: ${issue.filed}/${issue.active} filed · "${issue.headline}" · ${html.length} bytes · hero ${hero}`);
  console.log(`subject: ${issue.subject}`);
  console.log(`preview: ${issue.preview}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
