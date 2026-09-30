import { requiredReturnCopy } from '@/lib/value/owner-return';
import { HolderSummary } from '@/components/value/HolderSummary';
import { HolderLink } from '@/components/value/HolderLink';
import { displayName } from '@/lib/value/presentation';
import { compactMoney } from '@/lib/format';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDossier, getTopIds, getSearchCompany, getPrice } from '@/lib/value/store';
import { getIndex } from '@/lib/data';
import { Face } from '@/components/Face';
import { SearchInput } from '@/components/Search';
import { ValueLink } from '@/components/value/ValueLink';
import { DossierContent } from '@/components/value/DossierContent';

export const revalidate = 86400;
export const dynamicParams = true;
type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  try { return (await getTopIds()).map(id => ({ id: id.toLowerCase() })); }
  catch { return []; }
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dossier = await getDossier((await params).id.toUpperCase());
  const description = dossier ? `${dossier.company.name}: ${requiredReturnCopy(dossier.valuation, dossier.company.country)}. Five quality tests plus price.` : 'Company not found';
  return { description, openGraph: { description }, title: dossier ? `${dossier.company.name}: Buffett checklist` : 'Company not found', alternates: { canonical: `/${(await params).id.toLowerCase()}` } };
}
export default async function DossierPage({ params }: Props) {
  const dossier = await getDossier((await params).id.toUpperCase());
  if (!dossier) {
    const company=await getSearchCompany((await params).id);
    if (!company) notFound();
    return <section className="not-found-value locks-scroll"><p className="eyebrow">{company[0]} · {company[2]}</p><h1>{displayName(company[1])}</h1><h2>Not analysed yet</h2><p>This business is in our coverage queue. Its Buffett checklist arrives within days as we work through the latest filings.</p><p className="source-line">{company[4]!==null?`Market capitalisation: ${compactMoney(company[4],'USD')}. `:''}Listed in {company[2]}.</p><SearchInput/><p><ValueLink href="/">← Explore analysed companies</ValueLink></p></section>;
  }
  if (/[^\x00-\x7F]/.test(dossier.company.name)) {
    const listing=await getSearchCompany(dossier.id);
    if(listing&&/^[\x00-\x7F]+$/.test(listing[1])) dossier.company={...dossier.company,nativeName:dossier.company.name,name:listing[1]};
  }
  const { company } = dossier;
  const investors = dossier.holders.length ? await getIndex() : null;
  const quote=await getPrice(dossier.id,company.country);
  return <DossierContent dossier={dossier} quote={quote}>
    {dossier.holders.length>0&&<section className="holders"><h2><HolderSummary holders={dossier.holders}/></h2>
      {dossier.holders.length ? <ul className="holder-stack">{dossier.holders.slice(0,5).map((holder) => {
        const investor = investors?.investors.find((item) => item.code === holder.code);
        return <li key={holder.code}><HolderLink name={holder.name} code={holder.code}>
          {investor?.sketch && <span className="holder-face"><Face slug={investor.slug} size={320} sizes="32px" /></span>}<span className="sr-only">{holder.name}</span>
        </HolderLink></li>;
      })}</ul> : <p className="text-sm text-ink/60">No tracked holders.</p>}
      {dossier.holders.length > 0 && <p>Including {dossier.holders[0].name}</p>}
    </section>}
  </DossierContent>;
}
