import { config } from "dotenv";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { render } from "@react-email/render";
import React from "react";

config({ path: [".env.local", ".env"] });

// Usage: tsx scripts/newsletter/build-issue.ts [quarter] [--facts-only]
// Defaults to the newest quarter in the index. Writes data/newsletter/<slug>.json, the HTML
// and the hero PNG under public/newsletter/. Reuses stored prose unless --rewrite is passed.
async function main() {
  const { buildFacts, lastName } = await import("../../lib/newsletter/issue");
  const { composeProse } = await import("../../lib/newsletter/write");
  const { renderHero } = await import("../../lib/newsletter/hero");
  const { issueSlug, writeIssue, readIssue } = await import("../../lib/newsletter/store");
  const { QuarterIssue } = await import("../../emails/QuarterIssue");
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const root = path.join(process.cwd(), "data", "store");
  const index = JSON.parse(readFileSync(path.join(root, "index.json"), "utf8"));
  const quarter = args.find((a) => !a.startsWith("--")) ?? index.quarters[index.quarters.length - 1];
  const investors: Record<string, unknown> = {};
  for (const i of index.investors) {
    const f = path.join(root, "investors", `${i.code}.json`);
    if (existsSync(f)) investors[i.code] = JSON.parse(readFileSync(f, "utf8"));
  }
  const stocks: Record<string, unknown> = {};
  for (const f of readdirSync(path.join(root, "stocks"))) Object.assign(stocks, JSON.parse(readFileSync(path.join(root, "stocks", f), "utf8")));
  const facts = buildFacts(quarter, index, investors as never, stocks as never);
  const slug = issueSlug(quarter);
  const existing = readIssue(slug)?.manifest;
  if (flags.has("--facts-only")) {
    const out = path.join(process.cwd(), "data", "newsletter", `${slug}.facts.json`);
    writeFileSync(out, JSON.stringify(facts, null, 2));
    return console.log(`facts written to ${out}`);
  }
  const prose = existing?.prose && !flags.has("--rewrite") ? existing.prose : await composeProse(facts);
  const heroFile = path.join(process.cwd(), "public", "newsletter", `${slug}.png`);
  const hero = await renderHero(facts, heroFile);
  const people = index.investors.map((i: { person: string; slug: string; code: string }) => ({ name: lastName(i.person), slug: i.slug, code: i.code }));
  const html = await render(React.createElement(QuarterIssue, { facts, prose, people, heroUrl: hero ? `https://gigainvestors.com/newsletter/${slug}.png` : undefined }));
  writeIssue(
    {
      quarter,
      slug,
      headline: prose.headline,
      subject: `${quarter}: ${prose.headline}`.slice(0, 78),
      prose,
      stats: { filed: facts.filed, active: facts.active, aggregate: facts.aggregate },
      builtAt: new Date().toISOString(),
      ...(existing?.sentAt ? { sentAt: existing.sentAt, broadcastId: existing.broadcastId, recipients: existing.recipients } : {}),
    },
    html,
  );
  console.log(`built ${slug}: ${facts.filed}/${facts.active} filed · "${prose.headline}" · ${html.length} bytes · hero ${hero}`);
  console.log(prose.paragraphs.join("\n\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
