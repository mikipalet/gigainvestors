import { getIndex, getSearchIndex, getStock } from "@/lib/data";
import { md, stockMarkdown } from "@/lib/agent-content";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const search = await getSearchIndex();
  return (search?.stocks ?? []).map((s) => ({ ticker: s.t }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await ctx.params;
  const [index, stock] = await Promise.all([getIndex(), getStock(decodeURIComponent(ticker).toUpperCase())]);
  if (!stock || !index) return md("# Not found\n\nSee https://gigainvestors.com/sitemap.xml", 404);
  const people = Object.fromEntries(index.investors.map((i) => [i.code, i.person]));
  return md(stockMarkdown(stock, people));
}
