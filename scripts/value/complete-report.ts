import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {corpusPath,readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {isDecided,shortHistory} from '../../lib/value/publication-eligibility';
import {ownerReturn} from '../../lib/value/owner-return';
import type {Analysis,Dossier,PriceMap} from '../../lib/value/types';
import {QUALITY_TESTS} from '../../lib/value/types';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const before=readCorpusJson<any>('completeness/before.json')!;
const baselineBuys=new Set(readCorpusJson<Array<{id:string}>>('completeness/before-buy.json')!.map(r=>r.id));
const after=new Map(readdirSync(corpusPath('analysis')).filter(f=>f.endsWith('.json')).map(f=>{const a=readCorpusJson<Analysis>('analysis/'+f)!;return [a.id,a] as const;}));
const status=(a:Analysis|undefined)=>!a?'absent':isDecided(a)?QUALITY_TESTS.every(k=>a.tests[k as keyof Analysis['tests']].result==='pass')?'pass':'fail':shortHistory(a)?'short history':'undecided';
const reasons:Record<string,number>={},nearReasons:Record<string,number>={};
const near=before.companies.filter((a:any)=>a.near&&Object.values(a.results).includes('unclear'));
const transitions:Record<string,number>={};
for(const a of near){const s=status(after.get(a.id));transitions[s]=(transitions[s]??0)+1;}
for(const b of before.companies){const a=after.get(b.id);if(!a)continue;
 for(const [key,t]of Object.entries(a.tests))if(t.result==='unclear')for(const r of t.reasons){const k=`${key}: ${r}`;reasons[k]=(reasons[k]??0)+1;if(b.near)nearReasons[k]=(nearReasons[k]??0)+1;}
}
const oldReasons=Object.keys(before.reasons).filter(r=>r.includes('not enough data')).sort((a,b)=>before.reasons[b]-before.reasons[a]);
const attempts=readdirSync(corpusPath('completeness/attempts')).filter(f=>f.endsWith('.json')).map(f=>readCorpusJson<any>('completeness/attempts/'+f));
const sourceCounts:Record<string,{read:number;empty:number;errors:number;added:number}>={},sourceOutcomes:Record<string,number>={};
for(const r of attempts){
 for(const a of r.attempts){const c=sourceCounts[a.source]??={read:0,empty:0,errors:0,added:0};c.added+=a.added;}
 for(const a of new Map<string,any>(r.attempts.map((a:any)=>[a.source,a])).values()){
  sourceCounts[a.source][a.status==='read'?'read':a.status==='no annual observations'?'empty':'errors']++;
  if(a.status!=='read'&&a.status!=='no annual observations')sourceOutcomes[`${a.source}: ${a.status}`]=(sourceOutcomes[`${a.source}: ${a.status}`]??0)+1;
 }
}
const staging=process.env.VALUE_STAGING_DIR??corpusPath('staging/complete-1');
const dossiers:Dossier[]=readdirSync(staging+'/dossiers').flatMap(f=>Object.values(read(staging+'/dossiers/'+f)) as Dossier[]);
const prices:PriceMap=Object.assign({},...readdirSync(staging+'/prices').map(f=>read(staging+'/prices/'+f)));
const newBuys=dossiers.filter(d=>d.b&&!baselineBuys.has(d.id)).map(d=>{
 const v=d.valuation!,range=v.perShareTrading??v.perShare,price=prices[d.id]?.[0]??null;
 return {id:d.id,name:d.company.name,currency:d.company.currency,price,priceDate:prices[d.id]?.[1]??null,priceSource:prices[d.id]?.[2]??'quote',mid:range.mid,buy:range.mid*(1-(d.requiredMos??.25)),margin:price===null?null:1-price/range.mid,requiredMargin:d.requiredMos??.25,
 expectedReturn:ownerReturn(v,d.company.currency,d.company.marketCapUsd,price)?.expected??null,requiredReturn:v.discountRate,
 roicOrRoe:d.tests.moat.metrics.roicMedian??d.tests.moat.metrics.roeMedian,ownerToIncome:d.tests.economics.metrics.oeToNi??null,retainedGain:d.tests.management.metrics.marketCapGain??null,retainedEarnings:d.tests.management.metrics.retainedEarnings??null,perShareGrowth:d.tests.management.metrics.perShareValueGrowth??null};
});
const counts:Record<string,number>={};for(const a of after.values()){const s=status(a);counts[s]=(counts[s]??0)+1;}
const cohortCounts:Record<string,number>={};for(const b of before.companies){const s=status(after.get(b.id));cohortCounts[s]=(cohortCounts[s]??0)+1;}
const historyBefore=before.companies.filter((b:any)=>Object.values(b.reasons).flat().includes('fewer than 7 annual periods')).length;
const provenance={companies:0,methods:{} as Record<string,number>,fields:{} as Record<string,number>};
for(const file of readdirSync(corpusPath('fundamentals')).filter(f=>f.endsWith('.json'))){
 const f=readCorpusJson<any>('fundamentals/'+file);provenance.companies++;
 for(const y of f.years)for(const [key,p]of Object.entries(y.provenance??{}) as Array<[string,{method:string}]>){
  provenance.methods[p.method]=(provenance.methods[p.method]??0)+1;
  if(['derived','estimate','absent-in-complete-statement'].includes(p.method))provenance.fields[key]=(provenance.fields[key]??0)+1;
 }
}
writeCorpusJson('completeness/provenance-counts.json',provenance);
const summary={before:before.companies.length,after:after.size,counts,cohortCounts,provenance,near:{companies:near.length,transitions,details:near.map((b:any)=>({id:b.id,before:b.results,after:after.get(b.id)?.tests?Object.fromEntries(Object.entries(after.get(b.id)!.tests).map(([k,t])=>[k,t.result])):null,classification:status(after.get(b.id))}))},sourceCounts,sourceOutcomes,reasons,nearReasons,newBuys,publishedDossiers:dossiers.length,publishedDecided:dossiers.filter(d=>d.status==='scored').length};
writeCorpusJson('completeness/summary.json',summary);
const jpBefore=read('tests/fixtures/value/complete/6048.JP.json').fundamentals.years;
const jpNow=readCorpusJson<any>('fundamentals/6048.JP.json').years;
const jpAdded=jpNow.reduce((count:number,y:any)=>count+Object.entries(y).filter(([key,v])=>typeof v==='number'&&key!=='fy'&&jpBefore.find((old:any)=>old.end===y.end)?.[key]==null).length,0);
const n=(x:number|null|undefined)=>x==null?'—':x.toLocaleString('en-US',{maximumFractionDigits:2}),pct=(x:number|null|undefined)=>x==null?'—':`${n(x*100)}%`;
const lines=[`# Complete data — local audit`,
`Starting commit: da56aec. No push, deployment, remote publication, or subagents. Paid EODHD requests were disabled in all corpus, calibration, publication, build and serving commands. Unit tests exercise mocked providers.`,
`The comparison cohort contains ${n(summary.before)} pre-round analysis records. The final corpus contains ${n(summary.after)}. Final classifications: ${Object.entries(counts).map(([k,v])=>`${k}: ${n(v)}`).join('; ')}. Published dossiers: ${n(dossiers.length)} (${n(summary.publishedDecided)} decided, ${n(dossiers.length-summary.publishedDecided)} short-history direct URLs).`,
`Within the original comparison cohort, final classifications are ${Object.entries(cohortCounts).map(([k,v])=>`${k}: ${n(v)}`).join('; ')}. The full pass also includes previously unanalyzed universe companies; their addition is separate from this comparison.`,
`## Decisions and derivations`,
`Seven annual periods establish history. Core rules: predictable profits require loss years and operating-margin level/variation; moat requires return median and second-lowest return; economics requires five paired owner-earnings/net-income observations; management requires the retained-dollar test or per-share earnings/book-value growth; accounting requires accruals and cash backing (cash backing for financial companies). Present supporting failures retain their thresholds; absent supporting measures are omitted.`,
`Statement derivations cover gross profit, operating income, diluted shares from earnings/EPS, retained earnings changes, cash-flow SBC/repurchases, last-resort repurchases from shares × mean monthly price, NWC, invested capital, and explicit complete-statement zeroes. Missing statements never establish zero. Cash-flow owner earnings deduct all capital spending if depreciation or maintenance-investment detail is absent. Values retain source and derivation metadata in the private fundamentals corpus; price-derived market capitalisations, average prices and estimated repurchases are recorded in analysis/inputs/.`,
`Explicit secondary reported facts replace inferred absence zeroes and fallback estimates, and dependent derivations are refreshed. Trusted contradictory filing evidence produces a failed test with its reason. Retained provenance: ${Object.entries(provenance?.methods??{}).map(([k,v])=>`${k}: ${n(v as number)}`).join('; ')}.`,
`Direct filing facts also replace opaque legacy cached values for the exact fiscal period. Balance-sheet reconciliation repaired ${readCorpusJson<any[]>('completeness/integrity-repairs.json')?.length??0} inconsistent records, including wrong-year Daifuku assets; reported minority interests are fetched explicitly, never invented as a balancing residual.`,
`The balance pass checked 863 inconsistent records across the expanded corpus. Yahoo returned reported minority interests for 757 of them (2,943 annual observations), with 106 empty responses and no fetch errors.`,
`## Before / after unresolved reasons`,
`Counts below use the same pre-round cohort. Supporting reasons disappear by design when their core test is decided. Remaining core absence is private. Near-quality means at least three passes and no failures before this round.`,
`| Reason | Before | Near before | After | Near after |`,`|---|---:|---:|---:|---:|`,
...[...oldReasons,...Object.keys(reasons).filter(r=>r.includes('not enough data')&&!oldReasons.includes(r))].map(r=>`| ${r.replaceAll('|','/')} | ${n(before.reasons[r]??0)} | ${n(before.nearReasons[r]??0)} | ${n(reasons[r]??0)} | ${n(nearReasons[r]??0)} |`),
`| Companies with fewer than seven usable annual periods | ${n(historyBefore)} | 0 | ${n(cohortCounts['short history']??0)} | 0 |`,
``, `Formerly unresolved near-quality companies: ${n(near.length)}. Outcomes: ${Object.entries(transitions).map(([k,v])=>`${k} ${n(v)}`).join('; ')}. Company-level comparisons are retained in ~/value-corpus/completeness/summary.json and before.json.`,
`## Second sources`, `| Source | Annual data read | Empty | Other outcomes | Added values |`,`|---|---:|---:|---:|---:|`,
...Object.entries(sourceCounts).map(([k,v])=>`| ${k} | ${n(v.read)} | ${n(v.empty)} | ${n(v.errors)} | ${n(v.added)} |`),
`Source statuses count the latest outcome per company/source; added values include successful retry fills. Other outcomes: ${Object.entries(sourceOutcomes).map(([k,v])=>`${k} (${v})`).join('; ')}.`,
`ESEF uses exact legal-name LEI lookup when ISIN is absent. Yahoo exchange routing now includes Stuttgart, Munich, Düsseldorf, NEO, [Pakistan](https://sg.finance.yahoo.com/quote/MEBL.KA/) and [Vietnam](https://ca.finance.yahoo.com/quote/VHM.VN/).`,
``, `Per-company attempts and residual fields: ~/value-corpus/completeness/attempts/. Private exclusion list: ~/value-corpus/staging/undecided.json. Normalized secondary facts are cached, with source provenance; no extra store copies were made.`,
`Historical snapshot rows are restricted to currently eligible companies and five decided historical outcomes; historical snapshot calculations themselves were not rerun in this round.`,
`## Named cases`,
`Adobe (ADBE.US) was the reported ROIC bug: finite years of 342.2456% and 488.4449%, eight positive-profit/nonpositive-capital years represented as Infinity, and consequently a null serialized median. Returns now use equity-plus-debt capital when invested capital is nonpositive, or a finite “> 100%” representation when no positive denominator exists.`,
`HVID.CO: [the issuer's 2025 annual report](https://attachment.news.eu.nasdaq.com/a1f20f8058a09419332013c250307ee4d), contents p. 2 and auditor's scope p. 24, contains income, balance and equity statements but no cash-flow statement. SEC does not cover this issuer; ESEF and Yahoo yielded no operating cash-flow observation. The core cash-backing test cannot be established; the company is private rather than shown with a gap.`,
`6048.JP: The completed record has ${jpAdded} additional numeric inputs versus the recorded starting fixture. Final result: ${status(after.get('6048.JP'))}.`,
`AUQ.V: Both feeds omitted share-based payment reserves from equity. The [FY2025 audited filing](https://auqgold.com/wp-content/uploads/2025/10/AUQ_FS_2024_Q4.pdf#page=5) reports equity of CAD -950,568; the [FY2026 annual comparative](https://cdn.financialreports.eu/financialreports/media/filings/43747/2026/RNS/43747_rns_2026-07-30_27e01b76-f976-45ad-826d-3df5972605c4.pdf#page=3) reports CAD -80,884. Those direct reported totals restore both balance equations. The PDFs, extracted facts, provenance and regression fixture are retained.`,
`## New buy-zone names`,
`Compared with the ${baselineBuys.size} pre-round published buy-zone names. Numbers use the local staging price snapshot, in each listing's currency. These are model outputs for audit.`,
`| ID | Name | Currency | Price date / source | Price | Mid value | Buy price | Margin | Required margin | Expected / yr | Required / yr | Median return | OE / NI | Per-share growth |`,
`|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|`,
...newBuys.map(r=>`| ${r.id} | ${r.name.replaceAll('|','/')} | ${r.currency} | ${r.priceDate} / ${r.priceSource} | ${n(r.price)} | ${n(r.mid)} | ${n(r.buy)} | ${pct(r.margin)} | ${pct(r.requiredMargin)} | ${pct(r.expectedReturn)} | ${pct(r.requiredReturn)} | ${pct(r.roicOrRoe)} | ${n(r.ownerToIncome)} | ${pct(r.perShareGrowth)} |`),
``, `New buy-zone count: ${newBuys.length}. The JSON audit also includes market-value gain and cumulative retained earnings for each name.`,
`## Verification`, `FINAL_CHECKS`, ``, `## Disk`, `DISK_CHECKS`,
];
writeFileSync('complete-1-report.md',lines.map(l=>l.startsWith('|')?l:l+'\n').join('\n').trimEnd()+'\n');console.log(JSON.stringify({counts,near:summary.near.transitions,newBuys:newBuys.length,published:dossiers.length}));
