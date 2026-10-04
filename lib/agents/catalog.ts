import {VALUE_PRODUCT_NAME} from '@/lib/value/brand';
import {listIssues} from '@/lib/newsletter/store';
import {getAllStockTickers,getIndex,getSearchIndex} from '@/lib/data';
import {getDefaultIndex,getMeta} from '@/lib/value/store';
import {siteUrl,companyUrl,investorUrl,stockUrl,markdownUrl,type Site} from './urls';

export async function pageCatalog(site: Site) {
 const [index,tickers,meta,companies]=await Promise.all([getIndex(),site==='main'?getAllStockTickers():Promise.resolve([]),getMeta(),getDefaultIndex()]);
 const value=[{title:VALUE_PRODUCT_NAME,url:siteUrl('value'),asOf:meta?.asOf},{title:'Method',url:siteUrl('value','/method'),asOf:meta?.asOf},{title:'Forward record',url:siteUrl('value','/forward'),asOf:meta?.asOf},
  ...companies.map(c=>({title:`${c.nameEn??c.n} (${c.id})`,url:companyUrl(c.id),asOf:meta?.asOf})),
  ...Object.keys(meta?.views?.quarters??{}).map(q=>({title:`Checklist ${q}`,url:siteUrl('value',`/?q=${q}`),asOf:meta?.asOf})),
  ...Object.keys(meta?.views?.years??{}).map(y=>({title:`Checklist ${y}`,url:siteUrl('value',`/year/${y}`),asOf:meta?.asOf})),
 ];
 const main=[{title:'Investors',url:siteUrl('main'),asOf:index?.generatedAt},
  ...['about','privacy','munger','newsletter'].map(path=>({title:path,url:siteUrl('main',`/${path}`),asOf:index?.generatedAt})),
  ...listIssues().map(issue=>({title:issue.slug,url:siteUrl('main',`/newsletter/${issue.slug}`),asOf:issue.builtAt})),
  ...(index?.quarters??[]).map(q=>({title:`Investors ${q}`,url:siteUrl('main',`/?q=${q}`),asOf:index?.generatedAt})),
  ...(index?.investors??[]).flatMap(i=>[{title:`${i.person} — ${i.firm}`,url:investorUrl(i.code),asOf:index?.generatedAt},...i.series.map(q=>({title:`${i.person} ${q.q}`,url:`${investorUrl(i.code)}?q=${encodeURIComponent(q.q)}`,asOf:index?.generatedAt}))]),
  ...tickers.map(t=>({title:t,url:stockUrl(t),asOf:index?.generatedAt})),
 ];
 return {index,meta,pages:site==='value'?value:main,valuePages:value};
}
export async function searchMarkdown(query: string,kind:'companies'|'investors'|'all'='all',limit=10) {
 const q=query.trim().toLowerCase();
 if(!q||q.length>100)throw new Error('Search needs 1–100 characters');
 const [search,companies]=await Promise.all([getSearchIndex(),kind==='investors'?Promise.resolve([]):getDefaultIndex()]);
 const investors=kind==='companies'?[]:(search?.investors??[]).filter(i=>`${i.code} ${i.person} ${i.firm}`.toLowerCase().includes(q)).map(i=>({name:`${i.person} — ${i.firm}`,id:i.code,url:investorUrl(i.code)}));
 const rows=companies.filter(c=>`${c.id} ${c.nameEn??c.n}`.toLowerCase().includes(q)).map(c=>({name:c.nameEn??c.n,id:c.id,url:companyUrl(c.id)}));
 const stocks=kind==='investors'?[]:(search?.stocks??[]).filter(s=>`${s.t} ${s.n}`.toLowerCase().includes(q)).map(s=>({name:s.n,id:s.t,url:stockUrl(s.t)}));
 const matches=[...investors,...rows,...stocks].sort((a,b)=>Number(b.id.toLowerCase()===q)-Number(a.id.toLowerCase()===q));
 return [`# Search: ${query}`,`${matches.length} matching published pages; showing at most ${limit}.`,...matches.slice(0,limit).map(m=>`- [${m.name} (${m.id})](${markdownUrl(m.url)}) — canonical ${m.url}`)].join('\n\n');
}
