import { humanVerdict } from '@/lib/value/judgement/apply';
import { QUALITY_TESTS } from '@/lib/value/types';
import { T } from '@/lib/value/config';
import { getDossier, getPrice } from "@/lib/value/store";
import { comparableValuation } from "@/lib/value/site-valuation";
import { priceState, priceValue } from "@/lib/value/presentation";
import { notFound } from "next/navigation";
import { getAllStockTickers, getIndex, getStock } from "@/lib/data";
import { StockContent } from "@/components/AgentContent";
import { Stock } from "./Stock";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const tickers = await getAllStockTickers();
  // A renamed ticker is stored under its -OLD key; serve the plain name too, since that is
  // what a reader types and what the newsletter links to.
  const all = new Set(tickers.flatMap((t) => (t.endsWith("-OLD") ? [t, t.replace(/-OLD$/, "")] : [t])));
  return [...all].map((ticker) => ({ ticker }));
}

export async function generateMetadata(props: { params: Promise<{ ticker: string }> }) {
  const params = await props.params;
  const ticker = decodeURIComponent(params.ticker).toUpperCase();
  const stock = await getStock(ticker);
  return {
    title: stock ? `${stock.ticker} holders · GigaInvestors` : "GigaInvestors",
    description: stock ? `Which famous investors hold ${stock.name} (${stock.ticker}), how much, since when, and whether they are buying or selling, quarter by quarter.` : undefined,
    alternates: { canonical: `https://gigainvestors.com/s/${encodeURIComponent(ticker)}` },
  };
}

export default async function Page(props: { params: Promise<{ ticker: string }> }) {
  const params = await props.params;
  const ticker = decodeURIComponent(params.ticker).toUpperCase();
  const [index, stock] = await Promise.all([getIndex(), getStock(ticker)]);
  if (!index || !stock || stock.quarters.length === 0) notFound();
  const investors = Object.fromEntries(index.investors.map((i) => [i.code, { slug: i.slug, person: i.person, sketch: i.sketch }]));
  const dossier=await getDossier(`${ticker}.US`);
  const quote=dossier?await getPrice(dossier.id,dossier.company.country):null;
  const range=dossier?comparableValuation(dossier.valuation,dossier.company.currency):null;
  const qualityPassing=dossier?QUALITY_TESTS.filter(key=>dossier.tests[key]?.result==='pass').length:0;
  const price=priceState({price:quote?.[0]??null,mid:range?.perShare.mid??null,b:dossier?.b});
  const verdict=dossier?(dossier.status==='insufficient_data'||dossier.historyCoverage&&dossier.historyCoverage.years<T.minYears?'Not enough history yet':humanVerdict(dossier,Boolean(dossier.b),Boolean(range&&quote),priceValue({price:quote?.[0]??null,mid:range?.perShare.mid??null}))):'';
  const people = Object.fromEntries(index.investors.map((i) => [i.code, i.person]));
  return (
    <>
      <StockContent stock={stock} people={people} />
      <Stock stock={stock} investors={investors} checklist={dossier?{id:dossier.id,verdict,detail:`${qualityPassing} of ${QUALITY_TESTS.length} quality tests pass; price check: ${price.state==='pass'?'passes':price.state==='unclear'?'unavailable':'does not pass'}.`}:undefined} />
    </>
  );
}
