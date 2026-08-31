import { md } from "@/lib/agent-content";

export const dynamic = "force-static";

export async function GET() {
  return md(
    [
      "# 404 — nothing filed here",
      "",
      "This path does not exist on GigaInvestors. Where to look next:",
      "",
      "- Home (all investors): https://gigainvestors.com/",
      "- Investor pages: https://gigainvestors.com/{CODE} — e.g. https://gigainvestors.com/BRK",
      "- Stock pages: https://gigainvestors.com/s/{TICKER} — e.g. https://gigainvestors.com/s/NVDA",
      "- Sitemap: https://gigainvestors.com/sitemap.xml",
      "- Agent guide: https://gigainvestors.com/llms.txt",
    ].join("\n"),
    404,
  );
}
