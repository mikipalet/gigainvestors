import {pageAlternates} from '@/lib/agents/urls';
import { notFound } from "next/navigation";
import { getHolderCounts, getIndex, getInvestor } from "@/lib/data";
import { NoHoldings } from "./NoHoldings";
import { Investor } from "./Investor";
import { toWire } from "@/lib/wire";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const index = await getIndex();
  return (index?.investors ?? []).map((i) => ({ code: i.code }));
}

export async function generateMetadata(props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const index = await getIndex();
  const meta = index?.investors.find((i) => i.code === params.code);
  return {
    title: meta ? `${meta.person} · GigaInvestors` : "GigaInvestors",
    description: meta ? `${meta.person} (${meta.firm}): portfolio, positions and every quarterly move since ${meta.series[0]?.q ?? "2006"}, from 13F filings.` : undefined,
    alternates: {canonical:pageAlternates('main',`/${params.code}`).canonical},
  };
}

export default async function Page(props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const [index, data, holders] = await Promise.all([getIndex(), getInvestor(params.code), getHolderCounts()]);
  const meta = index?.investors.find((i) => i.code === params.code);
  if (!index || !meta) notFound();
  if (!data || data.quarters.length === 0) return <main className="legacy-investor"><link rel="alternate" type="text/markdown" href={pageAlternates("main",`/${params.code}`).types["text/markdown"]}/><NoHoldings meta={meta} /></main>;
  return (
    <main className="legacy-investor">
      <Investor wire={toWire(data)} slug={meta.slug} sketch={meta.sketch} holders={holders ?? {}} />
    </main>
  );
}
