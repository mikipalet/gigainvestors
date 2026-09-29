import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDossier, getPrice, getTopIds } from "@/lib/value/store";
import { priceTest } from "@/lib/value/price-test";
import { QUALITY_TESTS, type TestOutcome } from "@/lib/value/types";
import { getIndex } from "@/lib/data";
import { Face } from "@/components/Face";
import { Bridge } from "@/components/value/Bridge";
import { comparableValuation } from "@/lib/value/site-valuation";
import { TestChips } from "@/components/value/TestChips";
import { TestSection } from "@/components/value/TestSection";

export const revalidate = 86400;
export const dynamicParams = true;
type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  return (await getTopIds()).map((id) => ({ id: id.toLowerCase() }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dossier = await getDossier((await params).id.toUpperCase());
  return { title: dossier ? `${dossier.company.name}: Buffett checklist` : "Company not found", alternates: { canonical: `/${(await params).id.toLowerCase()}` } };
}

export default async function DossierPage({ params }: Props) {
  const dossier = await getDossier((await params).id.toUpperCase());
  if (!dossier) notFound();
  const { company, valuation, report } = dossier;
  const [quote, investors] = await Promise.all([getPrice(company.id, company.country), dossier.holders.length ? getIndex() : Promise.resolve(null)]);
  const comparable = comparableValuation(valuation, company.currency);
  const displayValue = comparable ?? valuation;
  const mismatch = valuation && !comparable ? `Price is in ${company.currency}, value in ${valuation.currency}, not compared` : null;
  const priceResult = priceTest(comparable, quote?.[0] ?? null);
  const price: TestOutcome = {
    key: "price", result: priceResult.result, numeric: priceResult.result,
    reasons: [quote ? mismatch ?? (valuation ? "Margin of safety compares the latest close with estimated per-share value." : dossier.valuationReason ?? "Not valued") : "No price yet"],
    metrics: quote && comparable ? { marginOfSafety: priceResult.mos } : {}, series: {}, jev: [],
  };
  const tests: TestOutcome[] = [...QUALITY_TESTS.flatMap((key) => key === "price" ? [] : [dossier.tests[key]]), price];
  const amount = (value: number) => `${displayValue?.currency ?? company.currency} ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const mos = price.metrics.marginOfSafety;
  const source = report.kind === "description" ? "Report not read, description only" : `Read: ${report.kind}${report.filed ? ` filed ${report.filed}` : ""}`;

  return <>
    <p className="mb-2 text-sm text-ink/60">{company.id} · {company.country} · {company.sector}</p>
    <h1 className="text-4xl font-semibold tracking-tight">{company.name}</h1>
    <div data-testid="verdict" className="my-6 space-y-4">
      {dossier.status === "insufficient_data" && <p className="text-ink/40">Insufficient data</p>}
      <p className="text-lg">{displayValue ? `Estimated value ${amount(displayValue.perShare.low)} to ${amount(displayValue.perShare.high)}` : dossier.valuationReason ?? "Not valued"} · {quote ? `Price ${company.currency} ${quote[0].toFixed(2)} (${quote[1]})` : "No price yet"}{mos != null && ` · ${(mos * 100).toFixed(1)}% margin of safety`}</p>
      {mismatch && <p className="text-sm">{mismatch}</p>}
      <TestChips tests={tests} />
    </div>
    <p className="mb-6 text-sm text-ink/60">{report.url ? <a href={report.url} className="underline">{source}</a> : source} · Analysis {dossier.asOf}</p>
    {tests.map((test) => <TestSection key={test.key} test={test} currency={valuation?.currency ?? company.currency} />)}
    {valuation && <Bridge valuation={valuation} />}
    <section className="border-t border-ink/20 py-6"><h2 className="mb-4 text-xl font-semibold">Superinvestor holders</h2>
      {dossier.holders.length ? <ul className="flex flex-wrap gap-6">{dossier.holders.map((holder) => {
        const investor = investors?.investors.find((item) => item.code === holder.code);
        return <li key={holder.code}><a className="flex items-center gap-3" href={`https://gigainvestors.com/s/${encodeURIComponent(company.code)}`}>
          {investor?.sketch && <span className="h-16 w-16"><Face slug={investor.slug} size={320} sizes="64px" /></span>}{holder.name}
        </a></li>;
      })}</ul> : <p className="text-sm text-ink/60">No tracked holders.</p>}
    </section>
  </>;
}
