import {readFileSync,readdirSync,existsSync,writeFileSync} from 'node:fs';
import {corpusPath,readCorpusJson} from '../../lib/value/corpus';
import {unpackView} from '../../lib/value/browser-view';
import {mainCompanies,mainZones} from '../../lib/value/main-layout';
import type {Analysis,IndexRow} from '../../lib/value/types';
const rows=[...new Map(readdirSync(corpusPath('publish-repo/index')).filter(f=>/^[A-Z]{2}\.json$/.test(f)).flatMap(f=>readCorpusJson<IndexRow[]>('publish-repo/index/'+f)??[]).map(r=>[r.id,r])).values()];
const meta=readCorpusJson<any>('publish-repo/meta.json');
const browser=[meta.views.current,...meta.views.deferred??[]].flatMap(f=>unpackView(readCorpusJson<any>('publish-repo/'+f)!));
// MainView's default gates admit quality passes; full next-closest list is covered,
// plus near misses regardless of their current price.
const next=mainZones(mainCompanies(browser.filter(r=>r.t==='PPPPP').map(row=>({row,quote:row.quote?.[0]??null,expected:row.expected,mos:null})))).next;
const aliases=readCorpusJson<Record<string,string>>('publish-repo/aliases.json')??{};
const holdings=JSON.parse(readFileSync('data/store/investors/BRK.json','utf8')).quarters.at(-1);
const held=new Set<string>(holdings.positions.map((p:any)=>aliases[p.ticker+'.US']??p.ticker+'.US'));
const requested=new Set(['KO.US','AAPL.US','GOOGL.US','MSFT.US','ORCL.US','META.US','NVDA.US','LULU.US','WKL.AS','ACN.US','JPM.US','CBG.LSE','AXP.US','BRK-B.US','7203.JP','RIGD.LSE','RACE.MI']);
const selected=rows.filter(r=>requested.has(r.id)||r.t==='PPPPP'||r.b||/^P*FP*$/.test(r.t)||held.has(r.id)||next.some(n=>n.id===r.id));
const entries=selected.map(row=>{const a=readCorpusJson<Analysis>(`analysis/${row.id}.json`);return {id:row.id,quality:row.t==='PPPPP',nearMiss:/^P*FP*$/.test(row.t),berkshire:held.has(row.id),judgement:existsSync(corpusPath(`judgement/${row.id}.json`)),overview:existsSync(corpusPath(`business-fit/overview/${row.id}.json`)),flags:existsSync(corpusPath(`flags/${row.id}.json`)),report:a?.report.kind,sections:a?.report.sections.length??0};});
const counts={published:rows.length,selected:entries.length,quality:entries.filter(r=>r.quality).length,nearMiss:entries.filter(r=>r.nearMiss).length,berkshire:entries.filter(r=>r.berkshire).length,missingJudgement:entries.filter(r=>!r.judgement).length,missingOverview:entries.filter(r=>!r.overview).length,missingFlags:entries.filter(r=>!r.flags).length,filingSections:entries.filter(r=>r.sections>0&&r.report!=='description').length};
writeFileSync('.integrate/staging/inventory.json',JSON.stringify({counts,entries},null,2));console.log(counts);
console.log('Conservative upper bound before passage/cached-extraction pruning:',counts.missingJudgement*44+counts.missingOverview*50+counts.missingFlags*104,'Jev requests. Typical: 20–50 requests per filing-backed company, 2–14 per description-only company.');
