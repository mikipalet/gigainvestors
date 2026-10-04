/** Integration seam for merge-1: change origins, valuePrefix and companyPath here.
 * Paths in the rest of the agent layer are logical, not deployment-specific. */
export type Site = 'main' | 'value';
export const PUBLIC_URLS = {
  main: 'https://gigainvestors.com',
  value: 'https://value.gigainvestors.com',
  valuePrefix: '',
  companyPath: (id: string) => `/${encodeURIComponent(id.toLowerCase())}`,
};
export function siteUrl(site: Site, path = '/') {
  return new URL(`${PUBLIC_URLS[site]}${site === 'value' ? PUBLIC_URLS.valuePrefix : ''}${path.startsWith('/') ? path : `/${path}`}`).toString();
}
export const companyUrl = (id: string) => siteUrl('value', PUBLIC_URLS.companyPath(id));
export function requestSite(request: Request): Site {
  const host = (request.headers.get('host') ?? new URL(request.url).host).split(':')[0].toLowerCase();
  return host === new URL(PUBLIC_URLS.value).hostname || host === process.env.VALUE_SITE_HOST ? 'value' : 'main';
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
