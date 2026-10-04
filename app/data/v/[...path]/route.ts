import {readPublishedBytes} from '@/lib/value/published-source';
import {isImmutablePath, isPublishedPath} from '@/lib/value/published-path';
import {VALUE_DATA_TAG} from '@/lib/value/data-source';
import {checkDataBot} from '@/lib/value/bot-protection';
import {gzipSync} from 'node:zlib';

export async function GET(request: Request, {params}: {params: Promise<{path: string[]}>}) {
  const file = (await params).path.join('/');
  const noStore = {'Cache-Control': 'no-store'};
  if (!isPublishedPath(file)) return new Response(null, {status: 404, headers: noStore});
  const denied = await checkDataBot(request);
  if (denied) return denied;
  try {
    const bytes = await readPublishedBytes(file);
    if (bytes === null) return new Response(null, {status: 404, headers: noStore});
    const immutable = isImmutablePath(file);
    const compressed = /(?:^|,)\s*gzip\s*(?:;\s*q=(?!0(?:\.0*)?(?:\s*,|\s*$))[^,]+)?\s*(?:,|$)/i.test(request.headers.get('accept-encoding') ?? '');
    return new Response(compressed ? new Uint8Array(gzipSync(bytes)) : bytes as BodyInit, {headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(compressed ? {'Content-Encoding': 'gzip'} : {}),
      'Vary': 'Accept-Encoding',
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate',
      'CDN-Cache-Control': immutable ? 'public, s-maxage=31536000, immutable' : 'public, s-maxage=60, stale-while-revalidate=300',
      'Vercel-CDN-Cache-Control': immutable ? 'public, s-maxage=31536000, immutable' : 'public, s-maxage=60, stale-while-revalidate=300',
      // The existing authenticated publish webhook expires this tag (Next 16 on Vercel).
      'Vercel-Cache-Tag': VALUE_DATA_TAG,
      'X-Content-Type-Options': 'nosniff',
    }});
  } catch {
    return Response.json({error: 'Value data temporarily unavailable'}, {status: 503, headers: noStore});
  }
}
