import { notFound } from "next/navigation";
import { getIndex, getInvestor } from "@/lib/data";
import { Investor } from "./Investor";

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  const index = await getIndex();
  return (index?.investors ?? []).map((i) => ({ code: i.code }));
}

export default async function Page(props: { params: Promise<{ code: string }>; searchParams: Promise<{ q?: string }> }) {
  const params = await props.params;
  const [index, data, sp] = await Promise.all([getIndex(), getInvestor(params.code), props.searchParams]);
  const meta = index?.investors.find((i) => i.code === params.code);
  if (!index || !data || !meta || data.quarters.length === 0) notFound();
  return <Investor data={data} slug={meta.slug} sketch={meta.sketch} allQuarters={index.quarters} initialQ={sp.q} />;
}
