import {pageCatalog} from '@/lib/agents/catalog';
export const revalidate=86400;
export default async function sitemap(){return (await pageCatalog('value')).pages.map(p=>({url:p.url,...(p.asOf?{lastModified:p.asOf}:{})}));}
