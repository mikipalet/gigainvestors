import { getDefaultIndex, getMeta } from "@/lib/value/store";
import ValueIndex from "./ValueIndex";

export const revalidate = 86400;

export default async function ValuePage() {
  const [meta, rows] = await Promise.all([getMeta(), getDefaultIndex()]);
  return <>
    <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">Buffett&apos;s checklist, run on {meta?.counts.universe.toLocaleString("en-US") ?? "0"} companies</h1>
    <p className="my-6 max-w-3xl text-sm leading-relaxed text-ink/70">Five independent tests assess the business, its economics, management and accounting. A sixth compares price with a range of estimated value. Numbers are computed from financial statements; report evidence supports the qualitative judgments. The default view passes all five quality tests, sorted by margin of safety. Missing data stays visible when you select a country, without a ranking.</p>
    {!meta && <p role="status">Company data is not available yet.</p>}
    <ValueIndex rows={rows} initialFilter={{}} tags={meta?.tags ?? {}} />
  </>;
}
