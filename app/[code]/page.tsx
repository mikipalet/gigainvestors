import { notFound } from "next/navigation";
import { getHolderCounts, getIndex, getInvestor } from "@/lib/data";
import { InvestorContent } from "@/components/AgentContent";
import { NoHoldings } from "./NoHoldings";
import { Investor } from "./Investor";

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
    alternates: { canonical: `https://gigainvestors.com/${params.code}` },
  };
}

export default async function Page(props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const [index, data, holders] = await Promise.all([getIndex(), getInvestor(params.code), getHolderCounts()]);
  const meta = index?.investors.find((i) => i.code === params.code);
  if (!index || !meta) notFound();
  if (!data || data.quarters.length === 0) return <NoHoldings meta={meta} />;
  return (
    <>
      <InvestorContent data={data} />
      <Investor data={data} slug={meta.slug} sketch={meta.sketch} holders={holders ?? {}} />
    </>
  );
}
