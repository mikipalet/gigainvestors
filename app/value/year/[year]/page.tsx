import {pageAlternates} from '@/lib/agents/urls';
export async function generateMetadata({params}:{params:Promise<{year:string}>}){const {year}=await params;return {title:`${year} historical checklist | GigaInvestors`,description:`Retrospective business checklist at the end of ${year}, covering analysed index companies using current restatements and today’s index membership.`,alternates:{canonical:pageAlternates('value',`/year/${year}`).canonical}};}
import { notFound } from 'next/navigation';
import { getMeta } from '@/lib/value/store';
import { renderValuePage } from '../../ValueHome';
export const revalidate = 86400;
export async function generateStaticParams() {
  const meta=await getMeta();
  return Object.keys(meta?.views?.years??{}).map(year=>({year}));
}
export default async function YearPage({params}:{params:Promise<{year:string}>}) {
  const {year}=await params;
  if(!/^\d{4}$/.test(year) || !(await getMeta())?.views?.years[year]) notFound();
  return renderValuePage(year);
}
