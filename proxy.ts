import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = (request.headers.get("host") ?? url.host).split(":")[0].toLowerCase();
  const pathname = url.pathname;
  const valuePath = pathname === "/value" || pathname.startsWith("/value/");
  if ((host === "gigainvestors.com" || host === "www.gigainvestors.com") && valuePath) {
    const target = new URL(`https://value.gigainvestors.com${pathname.slice(6) || "/"}`);
    target.search = url.search;
    return NextResponse.redirect(target, 308);
  }
  const asset = /^\/(?:_next|api|faces)(?:\/|$)/.test(pathname)
    || /\.(?:ico|png|svg|jpe?g|webp|avif|gif|css|js|map|woff2?|txt|html|pdf|json|webmanifest)$/i.test(pathname);
  const dossierPath = valuePath ? pathname.slice(6) : host.startsWith("value.") ? pathname : "";
  if (!asset && /^\/[a-z0-9.-]+$/i.test(dossierPath) && dossierPath !== dossierPath.toLowerCase()) {
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url, 308);
  }
  if (host.startsWith("value.") && !valuePath && !asset) {
    url.pathname = `/value${pathname}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|faces/|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|webp|avif|gif|css|js|map|woff|woff2|txt|html|pdf|json|webmanifest)$).*)"],
};
