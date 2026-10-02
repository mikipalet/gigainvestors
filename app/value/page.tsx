import {renderValuePage} from './ValueHome';
import {getMeta} from '@/lib/value/store';
export const revalidate = 86400;
export default async function ValuePage({searchParams}:{searchParams:Promise<Record<string,string>>}) {
 const query=await searchParams;
 const key=/^\d{4}Q[1-4]$/.test(query.q??'')?query.q:/^\d{4}$/.test(query.year??'')?`${query.year}Q4`:undefined;
 const meta=key?await getMeta():null;
 return renderValuePage(key&&(meta?.views?.quarters?.[key]||key.endsWith('Q4')&&meta?.views?.years[key.slice(0,4)])?key:undefined);
}
