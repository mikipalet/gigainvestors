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
