import { notFound } from "next/navigation";
import { getIndex, getSearchIndex, getStock } from "@/lib/data";
import { Stock } from "./Stock";

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  const search = await getSearchIndex();
  return (search?.stocks ?? []).slice(0, 150).map((s) => ({ ticker: s.t }));
}

export default async function Page(props: { params: Promise<{ ticker: string }> }) {
  const params = await props.params;
  const ticker = decodeURIComponent(params.ticker).toUpperCase();
  const [index, stock] = await Promise.all([getIndex(), getStock(ticker)]);
  if (!index || !stock || stock.quarters.length === 0) notFound();
  const investors = Object.fromEntries(index.investors.map((i) => [i.code, { slug: i.slug, person: i.person, sketch: i.sketch, series: i.series }]));
  return <Stock stock={stock} investors={investors} />;
}
