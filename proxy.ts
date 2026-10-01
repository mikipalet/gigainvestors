import { readStore } from './lib/value/store';
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = (request.headers.get("host") ?? url.host).split(":")[0].toLowerCase();
  const pathname = url.pathname;
  const valueHost = host === 'value.gigainvestors.com' || host === process.env.VALUE_SITE_HOST;
  const valuePath = pathname === "/value" || pathname.startsWith("/value/");
  const dossierPath = valuePath ? pathname.slice(6) : valueHost ? pathname : '';
  const asset = /^\/(?:_next|api|faces)(?:\/|$)/.test(pathname)
    || /\.(?:ico|png|svg|jpe?g|webp|avif|gif|css|js|map|woff2?|txt|html|pdf|json|webmanifest)$/i.test(pathname);
  const special = ['', '/', '/method', '/forward', '/sitemap.xml', '/robots.txt'].includes(dossierPath);
  if ((valuePath || !asset) && !special && !/^\/[a-z0-9&.-]{1,24}\.[a-z]{1,5}$/.test(dossierPath.toLowerCase())) {
    return new NextResponse('Not found', { status: 404 });
  }
  if ((host === "gigainvestors.com" || host === "www.gigainvestors.com") && valuePath) {
    const target = new URL(`https://value.gigainvestors.com${pathname.slice(6).toLowerCase() || "/"}`);
    target.search = url.search;
    return NextResponse.redirect(target, 308);
  }
  if (!asset && !special && dossierPath !== dossierPath.toLowerCase()) {
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url, 308);
  }
  if ((valueHost || valuePath) && !asset && !special) {
    const aliases=await readStore<Record<string,string>>('aliases.json');
    const home=aliases?.[dossierPath.slice(1).toUpperCase()];
    if(home&&home.toLowerCase()!==dossierPath.slice(1).toLowerCase()){
      url.pathname=`${valuePath?'/value':''}/${home.toLowerCase()}`;
      return NextResponse.redirect(url,308);
    }
  }
  if (valueHost && !valuePath && !asset) {
    const year=url.searchParams.get('year');
    url.pathname = pathname==='/'&&year&&/^\d{4}$/.test(year)?`/value/year/${year}`:`/value${pathname}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/value/:path*',
    { source: '/((?!_next/static|_next/image|faces/).*)', has: [{ type: 'host', value: '(value.gigainvestors.com|localhost)' }] },
  ],
};
