import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { render } from "@react-email/render";
import React from "react";

config({ path: [".env.local", ".env"] });

// Usage: tsx scripts/newsletter/build-issue.ts [quarter]  (defaults to the newest quarter in the index)
async function main() {
  const { deriveIssue } = await import("../../lib/newsletter/derive");
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
  const issue = deriveIssue(quarter, index, investors as never);
  const slug = issueSlug(quarter);
  const treemap = existsSync(path.join(process.cwd(), "public", "newsletter", `${slug}.png`)) ? `https://gigainvestors.com/newsletter/${slug}.png` : undefined;
  const html = await render(React.createElement(QuarterIssue, { issue, treemapUrl: treemap }));
  const existing = readIssue(slug)?.manifest;
  writeIssue(
    {
      quarter,
      slug,
      headline: issue.headline,
      subject: `${quarter}: ${issue.headline}`,
      builtAt: new Date().toISOString(),
      ...(existing?.sentAt ? { sentAt: existing.sentAt, broadcastId: existing.broadcastId, recipients: existing.recipients } : {}),
    },
    html,
  );
  console.log(`built ${slug}: ${issue.filed}/${issue.total} filed · "${issue.headline}" · ${html.length} bytes`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
