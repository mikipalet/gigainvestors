import { notFound } from "next/navigation";
import { getAllStockTickers, getIndex, getStock } from "@/lib/data";
import { StockContent } from "@/components/AgentContent";
import { Stock } from "./Stock";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getAllStockTickers()).map((ticker) => ({ ticker }));
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
  const people = Object.fromEntries(index.investors.map((i) => [i.code, i.person]));
  return (
    <>
      <StockContent stock={stock} people={people} />
      <Stock stock={stock} investors={investors} />
    </>
  );
}
