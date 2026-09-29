import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDossier, getTopIds } from '@/lib/value/store';
import { getIndex } from '@/lib/data';
import { Face } from '@/components/Face';
import { DossierContent } from '@/components/value/DossierContent';

export const revalidate = 259200;
export const dynamicParams = true;
type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  try { return (await getTopIds()).map(id => ({ id: id.toLowerCase() })); }
  catch { return []; }
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dossier = await getDossier((await params).id.toUpperCase());
  return { title: dossier ? `${dossier.company.name}: Buffett checklist` : 'Company not found', alternates: { canonical: `/${(await params).id.toLowerCase()}` } };
}
export default async function DossierPage({ params }: Props) {
  const dossier = await getDossier((await params).id.toUpperCase());
  if (!dossier) notFound();
  const { company } = dossier;
  const investors = dossier.holders.length ? await getIndex() : null;
  return <DossierContent dossier={dossier}>
    <section className="holders"><h2>Held by {dossier.holders.length} superinvestors</h2>
      {dossier.holders.length ? <ul className="holder-stack">{dossier.holders.slice(0,5).map((holder) => {
        const investor = investors?.investors.find((item) => item.code === holder.code);
        return <li key={holder.code}><a className="flex items-center gap-3" href={`https://gigainvestors.com/s/${encodeURIComponent(company.code)}`}>
          {investor?.sketch && <span className="holder-face"><Face slug={investor.slug} size={320} sizes="32px" /></span>}<span className="sr-only">{holder.name}</span>
        </a></li>;
      })}</ul> : <p className="text-sm text-ink/60">No tracked holders.</p>}
      {dossier.holders.length > 0 && <p>Including {dossier.holders[0].name}</p>}
    </section>
  </DossierContent>;
}
