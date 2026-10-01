/** Logo-only report research: writes bounded previews and attempt evidence under the logo cache. */
import {readdirSync} from 'node:fs';
import {corpusPath,readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {logoRequest,checkLogoDisk} from '../../lib/value/logo-fetch';
import {robotsRequest,type LogoAttempt} from '../../lib/value/logo-discovery';
import {reportCover} from '../../lib/value/logo-report';
import {pool} from '../../lib/value/http';
async function main(){
 const request=logoRequest(),overrides=readCorpusJson<Record<string,any>>('enrichment-v7/logos/_overrides.json')??{};
 const files=readdirSync(corpusPath('enrichment-v7/logos')).filter(f=>/^_report-search-.+\.json$/.test(f)&&f!=='_report-search-input.json');
 await pool({items:files,concurrency:2,run:async file=>{
  checkLogoDisk();const evidence=readCorpusJson<{company:{id:string};query:string;result:string}>('enrichment-v7/logos/'+file)!;
  if(!evidence.company)return;const id=evidence.company.id,record=readCorpusJson<any>(`enrichment-v7/logos/${id}.json`);if(record?.logo)return;
  const attempts:LogoAttempt[]=[{source:'annual-report-search',url:file,outcome:evidence.query}];let url=overrides[id]?.reportUrl;
  if(!url){
   const sina=evidence.result.match(/\((https:\/\/(?:money|vip\.stock)\.finance\.sina\.com\.cn\/corp\/view\/vCB_AllBulletinDetail\.php\?[^\n)]+)\)/)?.[1];
   if(sina)try{const response=await robotsRequest(request,attempts)(sina);if(!response.ok)throw Error('HTTP '+response.status);const html=await response.text();const links=[...html.matchAll(/href=["']([^"']+\.PDF(?:\?[^"']*)?)["']/gi)].map(m=>m[1].replace(/&amp;/g,'&'));
    url=links.find(u=>/file\.finance\.sina\.com\.cn|cninfo\.com\.cn|sse\.com\.cn|szse\.cn/.test(u));if(url?.startsWith('http:'))url=url.replace(/^http:/,'https:');
    attempts.push({source:'annual-report-search',url:sina,outcome:url?'annual-report PDF link found':'no PDF download link'});
   }catch(e){attempts.push({source:'annual-report-search',url:sina,outcome:String(e).slice(0,200)});}
  }
  if(url){const cover=await reportCover(id,request,attempts,url);if(cover)console.log(id,cover);if(!overrides[id]?.reportUrl){overrides[id]={...overrides[id],reportUrl:url};}}
  else attempts.push({source:'annual-report-search',outcome:'no verified latest annual PDF URL in search results'});
  const latest=readCorpusJson<any>(`enrichment-v7/logos/${id}.json`);writeCorpusJson(`enrichment-v7/logos/${id}.json`,{...latest,attempts:[...(latest?.attempts??[]),...attempts]});
 }});
 checkLogoDisk();const latest=readCorpusJson<Record<string,any>>('enrichment-v7/logos/_overrides.json')??{};
 for(const [id,o] of Object.entries(overrides))if(o.reportUrl)latest[id]={...latest[id],reportUrl:o.reportUrl};writeCorpusJson('enrichment-v7/logos/_overrides.json',latest);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
