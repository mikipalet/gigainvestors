import { timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { VALUE_DATA_TAG } from '@/lib/value/data-source';
export async function POST(request:Request) {
 const secret=process.env.VALUE_REVALIDATE_SECRET;
 if(!secret)return Response.json({error:'Revalidation is not configured'},{status:503});
 const expected=Buffer.from(`Bearer ${secret}`), supplied=Buffer.from(request.headers.get('authorization')??'');
 if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied))return Response.json({error:'Unauthorized'},{status:401});
 revalidateTag(VALUE_DATA_TAG,{expire:0});
 return Response.json({revalidated:true});
}
