import {companyAlternates} from '@/lib/agents/urls';
import {schemaJson,corporationSchema} from '@/lib/agents/schema';
import {companyMarkdown} from '@/lib/agents/company';
import { VALUE_PRODUCT_NAME } from '@/lib/value/brand';
import { requiredReturnCopy } from '@/lib/value/owner-return';
import { holderRecord } from '@/components/value/holder-record';
import { HolderSummary } from '@/components/value/HolderSummary';
import { HolderLink } from '@/components/value/HolderLink';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDossier, getTopIds, getSearchCompany, getPrice } from '@/lib/value/store';
import { getIndex, getInvestor } from '@/lib/data';
import { Face } from '@/components/Face';
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
  const required=dossier?requiredReturnCopy(dossier.valuation,dossier.company.country):'';
  const description = dossier ? dossier.status==='insufficient_data' ? `${dossier.company.name} | ${VALUE_PRODUCT_NAME}: Not enough history yet.` : `${dossier.company.name} | ${VALUE_PRODUCT_NAME}: five quality tests plus a price check.${required?` ${required}.`:''}` : 'Company not found';
  return { description, openGraph: { title: dossier ? `${dossier.company.name}: ${VALUE_PRODUCT_NAME}` : 'Company not found', description, siteName: VALUE_PRODUCT_NAME }, twitter: { title: dossier ? `${dossier.company.name}: ${VALUE_PRODUCT_NAME}` : 'Company not found', description }, title: dossier ? `${dossier.company.name}: ${VALUE_PRODUCT_NAME}` : 'Company not found', alternates: companyAlternates((await params).id) };
}
export default async function DossierPage({ params }: Props) {
  const dossier = await getDossier((await params).id.toUpperCase());
  if (!dossier) notFound();
  if (/[^\x00-\x7F]/.test(dossier.company.name)) {
    const listing=await getSearchCompany(dossier.id);
    if(listing&&/^[\x00-\x7F]+$/.test(listing[1])) dossier.company={...dossier.company,nativeName:dossier.company.name,name:listing[1]};
  }
  const { company } = dossier;
  const investors = dossier.holders.length ? await getIndex() : null;
  const holderRows=await Promise.all(dossier.holders.map(async h=>{
    const investor=investors?.investors.find(i=>i.code===h.code),history=await getInvestor(h.code);
    return {...h,firm:investor?.firm,portrait:investor?.sketch?investor.slug:undefined,position:holderRecord(history,company.code)};
  }));
  const quote=await getPrice(dossier.id,company.country);
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:schemaJson(corporationSchema(dossier))}} />
    <section className="sr-only" aria-label="Dated company data and chart values"><pre>{companyMarkdown(dossier,quote)}</pre></section>
    <DossierContent dossier={dossier} quote={quote}>
    {dossier.holders.length>0&&<section className="holders"><h2><HolderSummary holders={holderRows}/></h2>
      {dossier.holders.length ? <ul className="holder-stack">{dossier.holders.slice(0,5).map((holder) => {
        const investor = investors?.investors.find((item) => item.code === holder.code);
        return <li key={holder.code}><HolderLink name={holder.name} code={holder.code}>
          {investor?.sketch && <span className="holder-face"><Face slug={investor.slug} size={320} sizes="32px" /></span>}<span className="sr-only">{holder.name}</span>
        </HolderLink></li>;
      })}</ul> : <p className="text-sm text-ink/60">No tracked holders.</p>}
      {dossier.holders.length > 0 && <p>Including {dossier.holders[0].name}</p>}
    </section>}
  </DossierContent></>;
}
