import { md } from "@/lib/agent-content";

export const dynamic = "force-static";

export async function GET() {
  return md(
    [
      "# No markdown twin for this URL",
      "",
      "Markdown is served for the home page, investor pages, stock pages, the trust pages and the quarterly letters. Everything else is HTML only. Where to look:",
      "",
      "- Home (all investors): https://gigainvestors.com/",
      "- Investor pages: https://gigainvestors.com/{CODE} — e.g. https://gigainvestors.com/BRK",
      "- Stock pages: https://gigainvestors.com/s/{TICKER} — e.g. https://gigainvestors.com/s/NVDA",
      "- Sitemap: https://gigainvestors.com/sitemap.xml",
      "- Quarterly letters: https://gigainvestors.com/newsletter/{QUARTER} — e.g. https://gigainvestors.com/newsletter/2026-q2",
      "- Agent guide: https://gigainvestors.com/llms.txt",
    ].join("\n"),
    404,
  );
}
