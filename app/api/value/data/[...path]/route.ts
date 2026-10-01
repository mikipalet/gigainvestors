import { readStore } from '@/lib/value/store';
import { gzipSync } from 'node:zlib';

export async function GET(request: Request, {params}: {params: Promise<{path:string[]}>}) {
  const file=(await params).path.join('/');
  // Only published browser contracts. No arbitrary upstream URL or private corpus path.
  if (!/^(?:views\/[a-f0-9]{24}|search\/[a-z0-9][a-z0-9_&.\-]*|index\/(?:default|[A-Z]{2})|prices\/[A-Z]{2}|dossiers\/\d{3})\.json$/.test(file)) return new Response(null,{status:404});
  const data=await readStore(file);
  if (!data) return new Response(null,{status:404,headers:{'Cache-Control':'no-store'}});
  const compressed=/\bgzip\b/.test(request.headers.get('accept-encoding')??'');
  const text=JSON.stringify(data);
  return new Response(compressed?new Uint8Array(gzipSync(text)):text,{headers:{
    'Content-Type':'application/json',
    ...(compressed?{'Content-Encoding':'gzip'}:{}),
    'Vary':'Accept-Encoding',
    'Cache-Control':file.startsWith('views/')?'public, max-age=31536000, immutable':'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
    'X-Content-Type-Options':'nosniff',
  }});
}
