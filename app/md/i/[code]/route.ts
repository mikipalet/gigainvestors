import { getHolderCounts, getIndex, getInvestor } from "@/lib/data";
import { investorMarkdown, md } from "@/lib/agent-content";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export async function generateStaticParams() {
  const index = await getIndex();
  return (index?.investors ?? []).map((i) => ({ code: i.code }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const [d, holders, index] = await Promise.all([getInvestor(code), getHolderCounts(), getIndex()]);
  const meta = index?.investors.find((i) => i.code === code);
  if (!d) {
    if (!meta) return md("# Not found\n\nSee https://gigainvestors.com/sitemap.xml", 404);
    return md(`# ${meta.person} — ${meta.firm}\n\nNo 13F holdings on file for the latest quarter. The seat stays; the page fills in when a filing does.\n\nSee https://gigainvestors.com/${code}`);
  }
  const q=new URL(_req.url).searchParams.get('q');
  if(q&&!d.quarters.some(row=>row.q===q))return md('# Quarter not found',404);
  const selected=q?{...d,quarters:d.quarters.filter(row=>row.q<=q)}:d;
  return md(investorMarkdown(selected, q?{}:holders ?? {}));
}
