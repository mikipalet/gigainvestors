import { NextRequest, NextResponse } from 'next/server';
import { companyPath } from './lib/company-route';

export async function proxy(request: NextRequest) {
 const url=request.nextUrl.clone();
 const host=(request.headers.get('host')??url.host).split(':')[0].toLowerCase();
 const oldHost=host==='value.gigainvestors.com';
 const path=url.pathname;
 const local=path==='/value'?'':path.startsWith('/value/')?path.slice(6):path;
 const legacyYear=/^\/year\/(\d{4})$/.exec(local);
 const listing=!/\.(?:xml|txt|ico|png|svg|json|html|pdf|js|css)$/i.test(local)&&/^\/[a-z0-9&.%-]{1,40}\.[a-z]{1,5}$/i.test(local);
 if(oldHost || (path.startsWith('/value/')&&(listing||legacyYear))){
  const target=oldHost?new URL('https://gigainvestors.com'):new URL(url);
  target.pathname=listing?companyPath(decodeURIComponent(local.slice(1))):['','/'].includes(local)?'/value':['/method','/forward'].includes(local)?`/value${local}`:local;
  target.search=url.search;
  if(legacyYear){target.pathname='/value';if(!target.searchParams.has('q'))target.searchParams.set('q',`${legacyYear[1]}Q4`);}
  return NextResponse.redirect(target,308);
 }
 if(path.startsWith('/s/')){
  const normalized=companyPath(decodeURIComponent(path.slice(3)));
  if(path!==normalized){url.pathname=normalized;return NextResponse.redirect(url,308);}
 }
 return NextResponse.next();
}
export const config={matcher:['/((?!_next/static|_next/image).*)']};
