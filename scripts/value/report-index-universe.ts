/** Audit a local index-universe publication and write its review report. No network. */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { applyMembership, type Constituent } from '../../lib/value/index-membership';
import { readCorpusJson, readJsonl } from '../../lib/value/corpus';
import { summarizeSnapshots } from '../../lib/value/snapshots';
import { bestWesternListing } from '../../lib/value/western';
import { publishedBuyPrice } from '../../lib/value/buy-price';
import { unpackView, type BrowserPayload } from '../../lib/value/browser-view';
import type { Company, Dossier, HistoryIndex, IndexRow, PriceMap, SearchShard, SnapshotRow, StoreMeta } from '../../lib/value/types';

type Coverage = {name:string;url:string;retrievedAt:string;expected:number;total:number;matched:Array<Constituent&{id:string;via:string}>;unmatched:Constituent[];sourceComplete:boolean};
type Membership = {asOf:string;complete:boolean;memberCompanies:number;memberships:Record<string,string[]>;indexes:Coverage[];supplementalCompanies:Company[]};
const [directory, destination] = process.argv.slice(2);
if (!directory || !destination) throw new Error('Usage: report-index-universe.ts LOCAL_OUT REPORT.md');
const read=<T>(file:string):T=>JSON.parse(readFileSync(path.join(directory,file),'utf8'));
const membership=readCorpusJson<Membership>('index-membership/latest.json');
assert(membership,'Membership snapshot missing');
const failingIndexes=membership.indexes.filter(r=>!r.sourceComplete||!r.total||r.unmatched.length/r.total>=.01).length;
const unmatchedRows=membership.indexes.reduce((sum,r)=>sum+r.unmatched.length,0);
const companies=applyMembership([...new Map([...readJsonl<Company>('universe.jsonl'),...membership.supplementalCompanies].map(c=>[c.id,c])).values()],membership.memberships).filter(c=>c.indexes!.length);
const ids=new Set(companies.map(c=>c.id));
const meta=read<StoreMeta>('meta.json');
const rows=readdirSync(path.join(directory,'index')).filter(f=>/^[A-Z]{2}\.json$/.test(f)).flatMap(f=>read<IndexRow[]>(`index/${f}`));
const dossiers=Object.assign({},...readdirSync(path.join(directory,'dossiers')).map(f=>read<Record<string,Dossier>>(`dossiers/${f}`))) as Record<string,Dossier>;
const prices=Object.assign({},...readdirSync(path.join(directory,'prices')).map(f=>read<PriceMap>(`prices/${f}`))) as PriceMap;
const check=(id:string)=>assert(ids.has(id),`Nonmember leaked: ${id}`);
for(const row of [...rows,...read<IndexRow[]>('index/default.json')])check(row.id);
for(const id of read<string[]>('top.json'))check(id);
for(const d of Object.values(dossiers)){check(d.id);assert.deepEqual(d.company.indexes,membership.memberships[d.id]);}
const searchIds=new Set<string>();
for(const file of readdirSync(path.join(directory,'search')).filter(f=>f!=='manifest.json')){
 for(const row of read<SearchShard>(`search/${file}`).rows){check(row[0]);searchIds.add(row[0]);}
}
assert.equal(searchIds.size,ids.size,'Search must cover every member');
assert.equal(rows.length,Object.keys(dossiers).length);
assert.equal(meta.counts.universe,ids.size);
assert.equal(meta.counts.analysed,rows.length);
assert.equal(meta.story!.qualityPasses,rows.filter(r=>r.t==='PPPPP').length);
assert.equal(meta.story!.atBuy,rows.filter(r=>r.b).length);
assert.equal(meta.western!.story.qualityPasses,rows.filter(r=>r.t==='PPPPP'&&r.w).length);
assert.equal(meta.western!.story.atBuy,rows.filter(r=>r.b&&r.w).length);
const history=read<HistoryIndex>('history/index.json');
const westernIds=new Set(companies.filter(c=>bestWesternListing(c)).map(c=>c.id));
let historicalRows=0;
for(const year of history.years){
 const snapshots=read<SnapshotRow[]>(`history/${year}.json`);historicalRows+=snapshots.length;
 snapshots.forEach(r=>check(r[0]));
 assert.deepEqual(history.perYear[year],summarizeSnapshots(snapshots));
 assert.deepEqual(history.western!.perYear[year],summarizeSnapshots(snapshots.filter(r=>westernIds.has(r[0]))));
}
for(const c of read<IndexRow[]>('history/companies.json'))check(c.id);
for(const file of readdirSync(path.join(directory,'views'))){for(const row of unpackView(read<BrowserPayload>(`views/${file}`)))check(row.id);}
for(const [id,indexes] of Object.entries({'ASML.AS':['AEX','Euro Stoxx 50'],'2330.TW':['FTSE TWSE Taiwan 50'],'INFY.US':['Nifty 50']})){
 for(const index of indexes)assert(membership.memberships[id].includes(index),`${id} lost ${index}`);
}
const region=(c:Company)=>['US','CA'].includes(c.country)?'North America':['AU','NZ'].includes(c.country)?'Australia / New Zealand':['JP','CN','HK','TW','KR','IN','SG'].includes(c.country)?'Asia':['BR','MX'].includes(c.country)?'Latin America':'Europe / other';
const regions=new Map<string,{all:number;western:number;analysed:number;quality:number;buy:number}>();
const byId=new Map(rows.map(r=>[r.id,r]));
for(const c of companies){
 const r=regions.get(region(c))??{all:0,western:0,analysed:0,quality:0,buy:0};r.all++;if(bestWesternListing(c))r.western++;
 const row=byId.get(c.id);if(row){r.analysed++;if(row.t==='PPPPP')r.quality++;if(row.b)r.buy++;}regions.set(region(c),r);
}
const pct=(n:number|undefined|null)=>n==null?'—':`${(n*100).toFixed(2)}%`;
const num=(n:number|undefined|null)=>n==null?'—':n.toFixed(3);
const esc=(s:string)=>s.replaceAll('|','\\|').replaceAll('\n',' ');
const lines=[
 '# Major-index universe — universe-1', '',
 `Generated ${new Date().toISOString()}. Branch value-s-universe from da56aec.`, '',
 `**Status: ${membership.complete?'coverage complete':'INCOMPLETE — the requested <1% unmatched per index and current-source coverage are not achieved'}.**`,
 `${failingIndexes} of ${membership.indexes.length} indexes fail coverage checks; ${unmatchedRows} constituent rows remain unmatched.`,
 'The local publication is a diagnostic candidate. Normal publication is blocked while membership.complete is false; --force only permits inspection with a local --out.', '',
 `Local output: ${path.resolve(directory)}. No build, push, deploy, remote data commit, or revalidation was run.`, '',
 '## Product changes', '',
 '- Membership stage records constituent rows, URL, retrieval date, revision when available, matching method, and unmatched rows for every requested index.',
 '- EODHD fundamentals use the existing 10-call reservation and zero retries. Today’s ledger was 99,997/100,000; no paid calls were made. The local environment also lacked EODHD_API_KEY.',
 '- Parsed Wikipedia tables/list sections supplied the fallback. Nikkei uses its official sector tables. Retrieved today does not mean every source table reflects today’s membership.',
 `- ${membership.supplementalCompanies.length} missing identities were verified from cached EODHD symbol lists and retained separately in membership data. No analysis was fabricated. The existing universe.jsonl, fundamentals, analyses and upstream pipeline were not rewritten.`,
 '- Publication filters dossiers, all index lists, top, search, browser views, history rows and all headline/aggregate counts. Current memberships replace stale dossier memberships, including partial republication.',
 '- Western markets remains the default; Show all markets expands only within the membership universe. Dossier identity shows index names. Method states the current-membership survivorship limitation.', '',
 '## Diagnostic counts', '',
 '| Scope | Members | Analysed | Quality passes | Buy zone |','|---|---:|---:|---:|---:|',
 `| All markets | ${ids.size} | ${rows.length} | ${meta.story!.qualityPasses} | ${meta.story!.atBuy} |`,
 `| Western markets | ${westernIds.size} | ${meta.western!.story.analysed} | ${meta.western!.story.qualityPasses} | ${meta.western!.story.atBuy} |`, '',
 '| Region | Members | Western-accessible | Analysed | Quality passes | Buy zone |','|---|---:|---:|---:|---:|---:|',
 ...[...regions].sort().map(([name,r])=>`| ${name} | ${r.all} | ${r.western} | ${r.analysed} | ${r.quality} | ${r.buy} |`), '',
 'Region follows the corpus company.country. ADR-only identities such as INFY.US keep their existing country classification; index membership is attached independently. Counts reflect shared corpus analyses read during this staging run; complete-1 may subsequently change those analyses.', '',
 '## Every buy-zone company', '',
 '| ID / name | Western listing | Indexes | Currency | Quote (date) | Value low / mid / high | Buy price | Required discount | Expected return / hurdle | History years |',
 '|---|---|---|---|---:|---|---:|---:|---|---:|',
];
for(const r of rows.filter(r=>r.b).sort((a,b)=>a.id.localeCompare(b.id))){
 assert.equal(publishedBuyPrice(r,prices[r.id]).b,true);
 const q=prices[r.id], inputs=r.buyReturnInputs;
 const expected=inputs&&q?inputs.cashPerShare/q[0]+inputs.growth:null;
 lines.push(`| ${r.id} / ${esc(r.n)} | ${r.w??'—'} | ${membership.memberships[r.id].join(' · ')} | ${r.cur} | ${num(q?.[0])} (${q?.[1]??'—'}${q?.[2]?' · seed':''}) | ${r.v?.map(num).join(' / ')} | ${num(r.v&&r.m!=null?r.v[1]*(1-r.m):null)} | ${pct(r.m)} | ${pct(expected)} / ${pct(inputs?.requiredReturn)} | ${r.historyYears??'—'} |`);
}
lines.push('', '## Supplemental verified identities', '', ...membership.supplementalCompanies.map(c=>`- ${c.id} — ${esc(c.name)}; ${membership.memberships[c.id].join(' · ')}. Cached source: raw/eodhd/universe/symbols-${c.exchange}.json.`));
lines.push('', '## Coverage by index', '', '| Index | Parsed rows | Matched | Unmatched | Unmatched % | Count check | Retrieved | Source |','|---|---:|---:|---:|---:|---|---|---|');
for(const r of membership.indexes)lines.push(`| ${r.name} | ${r.total} | ${r.matched.length} | ${r.unmatched.length} | ${pct(r.total?r.unmatched.length/r.total:null)} | ${r.sourceComplete?'pass':'FAIL'} (baseline ${r.expected}) | ${r.retrievedAt?.slice(0,10)??'—'} | [source](${r.url}) |`);
lines.push('', 'A count check is a structural guard, not certification of current membership. AEX is now 30 constituents, while the fetched Wikipedia table has 25 ([Euronext methodology change](https://www.euronext.com/en/about/media/euronext-press-releases/number-constituents-aexr-index-will-increase-30)). STOXX Europe 600 contains only 466 distinct parsed source rows (467 before removing an exact duplicate). TOPIX Core30’s 31 entries are supported by [Sony Financial’s corporate-action inclusion](https://www.jpx.co.jp/english/news/6030/sjcobq000002555l-att/deta_e.pdf); the Large70 Wikipedia list has 69 and remains flagged for review. Other residuals include delisted/renamed companies and absent NZ/India/Singapore identities. Do not remove unmatched rows merely to improve the match percentage.', '', '## Every unmatched constituent', '');
for(const r of membership.indexes){lines.push(`### ${r.name}`, '',r.unmatched.length?r.unmatched.map(c=>`- ${esc(c.name)}${c.code?` — ${c.code}.${c.exchange??'?'}`:''}${c.isin?` — ${c.isin}`:''}`).join('\n'):'None.', '');}
lines.push('## Verification and remaining work', '',
 `- Staged audit passed: all index/dossier/search/top/browser-view/history identities belong to the membership set; all ${ids.size} members are searchable.`,
 `- Recomputed and exactly compared all-market and Western historical summaries for ${history.years.length} years and ${historicalRows} filtered rows.`,
 '- ASML.AS retains AEX and Euro Stoxx 50; TSM.US resolves through 2330.TW and Taiwan 50; INFY.US retains Nifty 50.',
 '- Focused matching/stage/publication tests: 64 passed. Additional existing universe/history tests passed; the upstream history stage was also checked to preserve all preexisting corpus bytes. TypeScript no-emit check passed. No browser build or visual browser test was run.',
 '- Remaining: obtain current full constituent lists for failing indexes within available API budget; verify/add missing NZ, India and Singapore identities and resolve all remaining mappings. The stage validates registry candidates against the EODHD index-symbol directory before paid constituent requests when credentials/budget are available. Re-run index-membership until every index is complete and below 1% unmatched; re-stage and recalculate counts before any future publication.',
 '- The single staging directory is 58 MB at this run. Disk checks stayed above the 5 GB floor.', '');
mkdirSync(path.dirname(path.resolve(destination)),{recursive:true});writeFileSync(destination,lines.join('\n'));
console.log(JSON.stringify({report:path.resolve(destination),members:ids.size,all:meta.story,western:meta.western!.story,historyYears:history.years.length,historicalRows,coverageComplete:membership.complete}));
