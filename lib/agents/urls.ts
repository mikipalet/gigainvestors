import {companyPath} from '../company-route';
/** Integration seam for merge-1: change origins, valuePrefix and companyPath here.
 * Paths in the rest of the agent layer are logical, not deployment-specific. */
export type Site = 'main' | 'value';
export const PUBLIC_URLS = {
  main: 'https://gigainvestors.com',
  value: 'https://gigainvestors.com',
  valuePrefix: '/value',
  companyPath,
};
export function siteUrl(site: Site, path = '/') {
  const suffix=path.startsWith('/')?path:`/${path}`;
  const logical=site==='value'&&(suffix==='/'||suffix.startsWith('/?'))?suffix.slice(1):suffix;
  return new URL(`${PUBLIC_URLS[site]}${site==='value'?PUBLIC_URLS.valuePrefix:''}${logical}`).toString();
}
export const companyUrl = (id: string) => siteUrl('main', PUBLIC_URLS.companyPath(id));
export function requestSite(request: Request): Site {
  const host = (request.headers.get('host') ?? new URL(request.url).host).split(':')[0].toLowerCase();
  return host === 'value.gigainvestors.com' ? 'value' : 'main';
}
export function markdownUrl(canonical: string) {
  const url = new URL(canonical);
  url.pathname = url.pathname.endsWith('/') ? `${url.pathname}index.md` : `${url.pathname}.md`;
  return url.toString();
}
export function pageAlternates(site: Site, path: string) {
  const canonical = siteUrl(site, path);
  return {canonical, types: {'text/markdown': markdownUrl(canonical)}};
}
export const companyAlternates = (id: string) => ({canonical: companyUrl(id), types: {'text/markdown': markdownUrl(companyUrl(id))}});
export const investorUrl = (code: string) => siteUrl('main', `/${encodeURIComponent(code)}`);
export const stockUrl = (ticker: string) => siteUrl('main', `/s/${encodeURIComponent(ticker.toUpperCase())}`);
export const apiUrl = () => siteUrl('main', '/api/v1');
