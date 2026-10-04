import {VALUE_PRODUCT_NAME} from '@/lib/value/brand';
import {pageAlternates} from '@/lib/agents/urls';
export async function generateMetadata({searchParams}:{searchParams:Promise<Record<string,string>>}){const q=await searchParams;const frame=/^\d{4}Q[1-4]$/.test(q.q??'')?q.q:/^\d{4}$/.test(q.year??'')?`${q.year}Q4`:null;return {title:`${VALUE_PRODUCT_NAME}${frame?' — '+frame:''} | GigaInvestors`,description:`Five business quality tests, price and expected annual return${frame?' reconstructed for '+frame:''}.`,alternates:{canonical:pageAlternates('value',frame?`/?q=${frame}`:'/').canonical}};}
import {renderValuePage} from './ValueHome';
import {getMeta} from '@/lib/value/store';
export const revalidate = 86400;
export default async function ValuePage({searchParams}:{searchParams:Promise<Record<string,string>>}) {
 const query=await searchParams;
 const key=/^\d{4}Q[1-4]$/.test(query.q??'')?query.q:/^\d{4}$/.test(query.year??'')?`${query.year}Q4`:undefined;
 const meta=key?await getMeta():null;
 return renderValuePage(key&&(meta?.views?.quarters?.[key]||key.endsWith('Q4')&&meta?.views?.years[key.slice(0,4)])?key:undefined);
}
