import { md } from "@/lib/agent-content";
import { listIssues, readIssue } from "@/lib/newsletter/store";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  return listIssues().map((i) => ({ issue: i.slug }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ issue: string }> }) {
  const { issue } = await ctx.params;
  const found = readIssue(issue);
  const prose = found?.manifest.prose;
  if (!found || !prose) return md("# Not found\n\nSee https://gigainvestors.com/newsletter", 404);
  const { manifest } = found;
  const { headline, paragraphs } = prose;
  const stats = manifest.stats;
  return md(
    [
      `# ${manifest.quarter}: ${headline}`,
      "",
      stats ? `${stats.filed} of ${stats.active} investors filed, holding ${Math.round(stats.aggregate / 1e9)}B dollars between them.` : "",
      manifest.sentAt ? `Sent ${manifest.sentAt.slice(0, 10)}.` : "Not sent yet.",
      "",
      ...paragraphs.flatMap((p) => [p, ""]),
      `Source: quarterly 13F filings via dataroma.com. Positions as reported at quarter end. Not advice.`,
      `HTML: https://gigainvestors.com/newsletter/${issue}`,
    ]
      .filter((l) => l !== "")
      .join("\n\n"),
  );
}
