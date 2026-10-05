import {readStore} from './lib/value/store';
import {dossierId} from './lib/company-route';
import {markdownRoute} from './lib/agents/routing';
import { NextRequest, NextResponse } from 'next/server';
import { companyPath } from './lib/company-route';

export async function proxy(request: NextRequest) {
 const url=request.nextUrl.clone();
 const host=(request.headers.get('host')??url.host).split(':')[0].toLowerCase();
 const oldHost=host==='value.gigainvestors.com';
 const path=url.pathname;
 const markdownSuffix=path.endsWith('.md')?'.md':'';
 const routePath=markdownSuffix?path.slice(0,-3).replace(/\/index$/,'')||'/':path;
 const local=routePath==='/value'?'':routePath.startsWith('/value/')?routePath.slice(6):routePath;
 const legacyYear=/^\/year\/(\d{4})$/.exec(local);
 const listing=!/\.(?:xml|txt|ico|png|svg|json|html|pdf|js|css)$/i.test(local)&&/^\/[a-z0-9&.%-]{1,40}\.[a-z]{1,5}$/i.test(local);
 if(oldHost || (path.startsWith('/value/')&&(listing||legacyYear))){
  const target=oldHost?new URL('https://gigainvestors.com'):new URL(url);
  target.pathname=listing?companyPath(decodeURIComponent(local.slice(1))):['','/'].includes(local)?'/value':['/method','/forward'].includes(local)?`/value${local}`:local;
  if(listing){const aliases=await readStore<Record<string,string>>('aliases.json');const id=dossierId(decodeURIComponent(local.slice(1)));if(aliases?.[id])target.pathname=companyPath(aliases[id]);}
  if(markdownSuffix)target.pathname+=markdownSuffix;
  target.search=url.search;
  if(legacyYear){target.pathname='/value'+markdownSuffix;if(!target.searchParams.has('q'))target.searchParams.set('q',`${legacyYear[1]}Q4`);}
  return NextResponse.redirect(target,308);
 }
 // Resolve identity before content negotiation: streamed pages cannot guarantee 308.
 if(routePath.startsWith('/s/')){
  const requested=decodeURIComponent(routePath.slice(3));
  const id=dossierId(requested).replace(/([A-Z]+)\.([A-Z])\.US$/, '$1-$2.US');
  const aliases=await readStore<Record<string,string>>('aliases.json');
  const normalized=companyPath(aliases?.[id]??requested)+markdownSuffix;
  if(path!==normalized){url.pathname=normalized;return NextResponse.redirect(url,308);}
 }
 const markdown=markdownRoute(path,false,request.headers.get('accept')??'');
 if(markdown){url.pathname=markdown;return NextResponse.rewrite(url);}
 if(path==='/value'){
  const q=url.searchParams.get('q')??'',year=url.searchParams.get('year')??'';
  const frame=/^\d{4}Q[1-4]$/.test(q)?q:/^\d{4}$/.test(year)?`${year}Q4`:null;
  if(frame){url.pathname=`/value/quarter/${frame}`;return NextResponse.rewrite(url);}
 }
 return NextResponse.next();
}
export const config={matcher:['/((?!_next/static|_next/image|data/).*)']};
