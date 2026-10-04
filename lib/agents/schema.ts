import {siteUrl, companyUrl, markdownUrl, type Site} from './urls';
import type {Dossier} from '@/lib/value/types';
export const schemaJson = (data: unknown) => JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
export function websiteSchema(site: Site) {
 const url=siteUrl(site), org=siteUrl('main','/#org');
 return {'@context':'https://schema.org','@graph':[
  {'@type':'Organization','@id':org,name:'GigaInvestors',url:siteUrl('main'),email:'hello@gigainvestors.com',sameAs:['https://github.com/mikipalet/gigainvestors']},
  {'@type':'WebSite','@id':`${url}#website`,url,name:site==='value'?'GigaInvestors Buffett checklist':'GigaInvestors',inLanguage:'en',publisher:{'@id':org},potentialAction:{'@type':'SearchAction',target:{'@type':'EntryPoint',urlTemplate:`${siteUrl(site,'/search.md')}?q={search_term_string}`},'query-input':'required name=search_term_string'}},
 ]};
}
export function datasetSchema(name: string, canonical: string, asOf?: string, description?: string) {
 return {'@context':'https://schema.org','@type':'Dataset',name,url:canonical,description:description??'Published checklist observations; historical reconstructions use current restatements and today’s surviving universe.',...(asOf?{dateModified:asOf}:{}),creator:{'@id':siteUrl('main','/#org')},isAccessibleForFree:true,conditionsOfAccess:'Public reading and citation. Underlying third-party source licenses apply; no blanket redistribution license is granted.',distribution:{'@type':'DataDownload',encodingFormat:'text/markdown',contentUrl:markdownUrl(canonical)}};
}
export function corporationSchema(d: Dossier) {
 return {'@context':'https://schema.org','@type':'Corporation','@id':`${companyUrl(d.id)}#company`,name:d.company.name,url:companyUrl(d.id),tickerSymbol:`${d.company.exchange}: ${d.company.code}`};
}
