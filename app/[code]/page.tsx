import { notFound } from "next/navigation";
import { getIndex, getInvestor } from "@/lib/data";
import { Investor } from "./Investor";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const index = await getIndex();
  return (index?.investors ?? []).map((i) => ({ code: i.code }));
}

export default async function Page(props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const [index, data] = await Promise.all([getIndex(), getInvestor(params.code)]);
  const meta = index?.investors.find((i) => i.code === params.code);
  if (!index || !data || !meta || data.quarters.length === 0) notFound();
  return <Investor data={data} slug={meta.slug} sketch={meta.sketch} />;
}
