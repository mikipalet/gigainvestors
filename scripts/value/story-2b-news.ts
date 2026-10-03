import dotenv from 'dotenv';
import {readFileSync,readdirSync} from 'node:fs';
import {corpusPath,readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {readDossiers,readGzip,writeGzip,storyDiskGuard} from '../../lib/value/price-story/corpus';
import {eodhd,callsUsedToday} from '../../lib/value/eodhd';
import {pool} from '../../lib/value/http';
import {thesisZone} from '../../lib/value/thesis/refresh';
import {readPrices} from '../../lib/value/price-story/corpus';

dotenv.config({path:'.env.local',quiet:true});
dotenv.config({path:corpusPath('.env.local'),quiet:true});
type Row={date:string;title:string;content?:string;link:string;source?:string};
type Cache={checked:string;rows:Row[];nextOffset?:number;complete?:boolean};
async function main(){
 storyDiskGuard();
 const date=new Date().toISOString().slice(0,10),from=new Date(date);from.setUTCMonth(from.getUTCMonth()-18);
 const ledger=`price-story/news-budget-${date}-story-2b.json`;
 const usage=readCorpusJson<{requests:number}>(ledger)??{requests:0};
 const dossiers=readDossiers(),prices=readPrices(),zones=new Map<string,number>();
 for(const file of readdirSync(corpusPath('publish-repo/index')).filter(f=>f.endsWith('.json'))){
  const packed=JSON.parse(readFileSync(corpusPath('publish-repo/index',file),'utf8'));
  for(const row of Array.isArray(packed)?packed:packed.rows.map((values:unknown[])=>Object.fromEntries(packed.columns.map((k:string,i:number)=>[k,values[i]])))){const zone=thesisZone(row as any,prices[row.id]);if(zone)zones.set(row.id,zone==='buy'?0:1);}
 }
 const rank=(id:string)=>zones.get(id)??(dossiers[id].company.indexes?.some(s=>/S&P 500|Nasdaq.?100|Dow/i.test(s))?2:3);
 const ids=Object.keys(dossiers).sort((a,b)=>rank(a)-rank(b)||(dossiers[b].company.marketCapUsd??0)-(dossiers[a].company.marketCapUsd??0)||a.localeCompare(b));
 writeCorpusJson('price-story/news-priority-story-2b.json',ids.map(id=>({id,priority:rank(id)})));
 console.log(`news universe=${ids.length}; provider used=${await callsUsedToday()}; cap=4000 requests (20000 calls)`);
 let done=0;
 async function fetchPage(id:string,offset:number){
  storyDiskGuard();if(usage.requests>=4000)return;
  // Persist BEFORE the paid attempt; crashes and failures still consume this run's cap.
  usage.requests++;writeCorpusJson(ledger,{...usage,calls:usage.requests*5});
  const file=corpusPath('price-story/news',id+'.json.gz');
  try{
   const batch=await eodhd<Row[]>('news',{s:id,from:from.toISOString().slice(0,10),to:date,limit:'1000',offset:String(offset)},{retries:0});
   if(!Array.isArray(batch))throw Error('Invalid news response');
   const prior=offset?readGzip<Cache>(file)?.rows??[]:[];
   const rows=batch.map(({date,title,content,link,source})=>({date,title,content:(content??'').split(/\n\s*\n|<\/p>/i)[0],link,source}));
   writeGzip(file,{checked:date,rows:[...prior,...rows],nextOffset:offset+batch.length,complete:batch.length<1000});
   done++;if(done%25===0)console.log(`news pages=${done} requests=${usage.requests} last=${id}`);
  }catch(e){if(String(e).includes('DISK STOP'))throw e;writeCorpusJson(`price-story/news-errors/${id}.json`,{date,error:String(e),offset});}
 }
 // Everyone receives a first request before pagination spends the remaining budget.
 await pool({items:ids,concurrency:24,run:async id=>{if(readGzip<Cache>(corpusPath('price-story/news',id+'.json.gz'))?.checked!==date)await fetchPage(id,0);}});
 while(usage.requests<4000){
  const pending=ids.filter(id=>{const c=readGzip<Cache>(corpusPath('price-story/news',id+'.json.gz'));return c?.checked===date&&!c.complete;});
  if(!pending.length)break;
  const before=usage.requests;
  await pool({items:pending,concurrency:24,run:async id=>{const c=readGzip<Cache>(corpusPath('price-story/news',id+'.json.gz'))!;await fetchPage(id,c.nextOffset??0);}});
  if(before===usage.requests)break;
 }
 console.log(`news finished pages=${done}; requests=${usage.requests}; calls=${usage.requests*5}`);
}
main().catch(e=>{console.error(e instanceof Error?e.message:'News refresh failed');process.exitCode=1;});
