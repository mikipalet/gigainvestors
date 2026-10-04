import { getIndex } from "@/lib/data";
import { homeMarkdown, md } from "@/lib/agent-content";

export const dynamic = "force-dynamic";

export async function GET(request:Request) {
  const index = await getIndex();
  const q=new URL(request.url).searchParams.get('q');
  if(q&&index&&!index.quarters.includes(q))return md('# Quarter not found',404);
  const selected=index&&q?{...index,quarters:index.quarters.filter(quarter=>quarter<=q),investors:index.investors.map(i=>({...i,series:i.series.filter(p=>p.q<=q)}))}:index;
  return selected ? md(homeMarkdown(selected)) : md("# GigaInvestors\n\nData unavailable.", 503);
}
