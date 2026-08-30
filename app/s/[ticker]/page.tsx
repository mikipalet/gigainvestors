import { notFound } from "next/navigation";
import { getIndex, getSearchIndex, getStock } from "@/lib/data";
import { Stock } from "./Stock";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const search = await getSearchIndex();
  return (search?.stocks ?? []).map((s) => ({ ticker: s.t }));
}

export default async function Page(props: { params: Promise<{ ticker: string }> }) {
  const params = await props.params;
  const ticker = decodeURIComponent(params.ticker).toUpperCase();
  const [index, stock] = await Promise.all([getIndex(), getStock(ticker)]);
  if (!index || !stock || stock.quarters.length === 0) notFound();
  const investors = Object.fromEntries(index.investors.map((i) => [i.code, { slug: i.slug, person: i.person, sketch: i.sketch, series: i.series }]));
  return <Stock stock={stock} investors={investors} />;
}
