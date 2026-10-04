import {pageCatalog} from './catalog';
import {siteUrl,type Site} from './urls';
const xml=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
export const sitemapParts=['pages','companies','investors','quarters'] as const;
export function sitemapIndex(site:Site) {
 return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapParts.map(p=>`<sitemap><loc>${xml(siteUrl(site,`/sitemaps/${p}.xml`))}</loc></sitemap>`).join('')}</sitemapindex>`;
}
export async function sitemapPart(site:Site,part:string) {
 const {pages}=await pageCatalog(site);
 const group=(url:string)=>{const p=new URL(url);if(p.searchParams.has('q')||p.pathname.includes('/year/'))return 'quarters';if(site==='value'?/\.[a-z]{1,5}$/i.test(p.pathname):p.pathname.startsWith('/s/'))return 'companies';if(site==='main'&&/^\/[A-Z]{1,8}$/.test(p.pathname))return 'investors';return 'pages';};
 return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.filter(p=>group(p.url)===part).map(p=>`<url><loc>${xml(p.url)}</loc>${p.asOf&&Number.isFinite(Date.parse(p.asOf))?`<lastmod>${new Date(p.asOf).toISOString()}</lastmod>`:''}</url>`).join('')}</urlset>`;
}
export const xmlResponse=(body:string)=>new Response(body,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=0, must-revalidate'}});
