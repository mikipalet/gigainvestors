import {getAllStockTickers} from '@/lib/data';
import {getDossier,getPrice} from '@/lib/value/store';
import {companyMarkdown} from '@/lib/agents/company';
import { getIndex, getSearchIndex, getStock } from "@/lib/data";
import { md, stockMarkdown } from "@/lib/agent-content";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export async function generateStaticParams() {
  const tickers=await getAllStockTickers();
  return [...new Set(tickers.flatMap(t=>t.endsWith("-OLD")?[t,t.replace(/-OLD$/,"")]:[t]))].map(ticker=>({ticker}));
}

export async function GET(_req: Request, ctx: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await ctx.params;
  const [index, stock] = await Promise.all([getIndex(), getStock(decodeURIComponent(ticker).toUpperCase())]);
  if (!stock || !index) return md("# Not found\n\nSee https://gigainvestors.com/sitemap.xml", 404);
  const people = Object.fromEntries(index.investors.map((i) => [i.code, i.person]));
  const q=new URL(_req.url).searchParams.get('q');
  if(q&&!stock.quarters.some(row=>row.q===q))return md('# Quarter not found',404);
  const selected=q?{...stock,quarters:stock.quarters.filter(row=>row.q<=q)}:stock;
  const dossier=!q?await getDossier(`${stock.ticker}.US`):null;
  return md(stockMarkdown(selected, people, q??undefined)+(dossier?'\n\n'+companyMarkdown(dossier,await getPrice(dossier.id,dossier.company.country)):''));
}
