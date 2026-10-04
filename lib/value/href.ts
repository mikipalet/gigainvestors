import { companyPath } from '@/lib/company-route';
/** All checklist links stay on the unified site, including previews. */
export function valueHref(path: string, _pathname?: string) {
 const url=new URL(path,'https://gigainvestors.com');
 const p=url.pathname;
 const target=/^\/[a-z0-9&.%-]+\.[a-z]{1,5}$/i.test(p)?companyPath(decodeURIComponent(p.slice(1))):p==='/'?'/value':p.startsWith('/value')||p.startsWith('/s/')?p:`/value${p}`;
 return `${target}${url.search}${url.hash}`;
}
