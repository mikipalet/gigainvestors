import { getHolderCounts, getIndex, getInvestor } from "@/lib/data";
import { investorMarkdown, md } from "@/lib/agent-content";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const index = await getIndex();
  return (index?.investors ?? []).map((i) => ({ code: i.code }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const [d, holders] = await Promise.all([getInvestor(code), getHolderCounts()]);
  if (!d) return md("# Not found\n\nSee https://gigainvestors.com/sitemap.xml", 404);
  return md(investorMarkdown(d, holders ?? {}));
}
