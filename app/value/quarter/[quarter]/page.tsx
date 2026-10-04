import {notFound} from 'next/navigation';
import {VALUE_PRODUCT_NAME} from '@/lib/value/brand';
import {pageAlternates} from '@/lib/agents/urls';
import {getMeta} from '@/lib/value/store';
import {renderValuePage} from '../../ValueHome';

// The proxy preserves the public /value?q= URL; only its ISR cache key changes.
export const revalidate=86400;
export const dynamicParams=true;
export function generateStaticParams(){return [];}
type Props={params:Promise<{quarter:string}>};
export async function generateMetadata({params}:Props){
 const {quarter}=await params;
 if(!/^\d{4}Q[1-4]$/.test(quarter))notFound();
 return {title:`${VALUE_PRODUCT_NAME} — ${quarter} | GigaInvestors`,description:`Five business quality tests, price and expected annual return reconstructed for ${quarter}.`,alternates:{canonical:pageAlternates('value',`/?q=${quarter}`).canonical}};
}
export default async function QuarterPage({params}:Props){
 const {quarter}=await params;
 if(!/^\d{4}Q[1-4]$/.test(quarter))notFound();
 const meta=await getMeta();
 return renderValuePage(meta?.views?.quarters?.[quarter]||quarter.endsWith('Q4')&&meta?.views?.years[quarter.slice(0,4)]?quarter:undefined);
}
