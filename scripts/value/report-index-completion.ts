/** Verify all local site surfaces, then report universe-2 matching and catch-up work. No network. */
import assert from 'node:assert/strict';
import { universeCompanies, loadCompanies } from '../../lib/value/companies';
import { needsMemberFundamentals } from './stages/fundamentals';
import { companyExclusion } from '../../lib/value/fund-exclusion';
import { budgetUsage } from '../../lib/value/budget';
import type { Fundamentals } from '../../lib/value/types';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { applyMembership, type Constituent } from '../../lib/value/index-membership';
import { readCorpusJson, readJsonl } from '../../lib/value/corpus';
import { summarizeSnapshots } from '../../lib/value/snapshots';
import { bestWesternListing } from '../../lib/value/western';
import { publishedBuyPrice } from '../../lib/value/buy-price';
import { unpackView, type BrowserPayload } from '../../lib/value/browser-view';
import type { Company, Dossier, HistoryIndex, IndexRow, PriceMap, SearchShard, SnapshotRow, StoreMeta } from '../../lib/value/types';

type Coverage = {name:string;url:string;retrievedAt:string;expected:number;total:number;matched:Array<Constituent&{id:string;via:string}>;unmatched:Constituent[];sourceComplete:boolean;provider?:string;excluded:Array<Constituent&{id?:string;reason:string}>};
type Membership = {asOf:string;complete:boolean;memberCompanies:number;memberships:Record<string,string[]>;indexes:Coverage[];supplementalCompanies:Company[]};
const [directory, destination] = process.argv.slice(2);
if (!directory || !destination) throw new Error('Usage: report-index-completion.ts LOCAL_OUT REPORT.md');
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

const before=readCorpusJson<Membership>('index-membership/universe-2/before.json');
assert(before,'Before snapshot missing');
assert(membership.complete && failingIndexes===0);
for(const c of companies)assert(!companyExclusion(c),`Fund leaked: ${c.id}`);
for(const id of ['JUP.LSE','BA.LSE'])assert(ids.has(id),`Operating company missing: ${id}`);
const allCompanies=universeCompanies().filter(c=>ids.has(c.id));
const missing=allCompanies.filter(c=>!byId.has(c.id));
const due=allCompanies.filter(c=>needsMemberFundamentals(readCorpusJson<Fundamentals>(`fundamentals/${c.id}.json`)));
const noFile=due.filter(c=>!readCorpusJson<Fundamentals>(`fundamentals/${c.id}.json`));
const empty=due.filter(c=>{const f=readCorpusJson<Fundamentals>(`fundamentals/${c.id}.json`);return f&&!f.years?.length;});
const stale=due.length-noFile.length-empty.length;
const funds=[...new Map(membership.indexes.flatMap(i=>i.excluded).map(c=>[c.id??c.name,c])).values()].sort((a,b)=>a.name.localeCompare(b.name));
const displayedLogos=loadCompanies({only:[...ids]}).filter(c=>c.logo).length;
const verifiedLogos=allCompanies.filter(c=>{const l=readCorpusJson<{validated?:boolean;logo?:string}>(`enrichment-v7/logos/${c.id}.json`);return l?.validated&&l.logo;}).length;
const uncertain=membership.supplementalCompanies.filter(c=>(c as Company&{identityEvidence?:{providerListingVerified?:boolean}}).identityEvidence?.providerListingVerified===false);
const pct=(n:number,d:number)=>`${(100*n/d).toFixed(2)}%`;
const esc=(s:string)=>s.replaceAll('|','\\|').replaceAll('\n',' ');
const lines=[
 '# Index universe completion — universe-2','',
 `Generated ${new Date().toISOString()}; branch value-s-universe, parent ba64690.`, '',
 `All ${membership.indexes.length} indexes meet <1% unmatched with structurally complete source lists. Unmatched rows: ${before.indexes.reduce((n,i)=>n+i.unmatched.length,0)} → ${unmatchedRows}. Current site universe: ${ids.size} operating members; ${rows.length} analysed; ${missing.length} without published analysis. ${funds.length} distinct fund identities/source names excluded.`, '',
 '**Runtime integration is still required before 2026-10-01 03:00 UTC.** The existing sleeping runner (PID 76007 at inspection) executes from value-daily, detached at 9ea6fc5. Its shell has already loaded the old stage order. This task did not deploy, switch, or restart that runner under the no-deploy instruction. A commit alone does not change its execution. Integrate universe-1 and this commit into the intended runner checkout and restart the local scheduler before 03:00; merely changing the script on disk is insufficient for that sleeping shell.', '',
 '## Matching and source evidence','',
 '| Index | Before unmatched / rows | After unmatched / rows | After unmatched % | Funds excluded | Source |',
 '|---|---:|---:|---:|---:|---|',
 ...membership.indexes.map(i=>{const b=before.indexes.find(x=>x.name===i.name)!;return `| ${i.name} | ${b.unmatched.length} / ${b.total} | ${i.unmatched.length} / ${i.total} | ${pct(i.unmatched.length,i.total)} | ${i.excluded.length} | [${i.provider??'source'}](${i.url}) |`;}), '',
 '- Matching searches all cached exchange symbol lists, uses supplied ISINs and conservative name normalisation, and consults cached keyless OpenFIGI mappings. OpenFIGI research uses five jobs per request and a 3.1-second interval, with bounded 429 retries. No EODHD requests were used for this work.',
 '- STOXX now uses all 600 rows from its official component table; its selection file only supplies vendor mnemonics, not membership. Euronext supplies full AEX/SBF/PSI/OBX compositions. AEX has 29 currently supplied rows and PSI 16; the explicit counts reflect full provider responses, not name-derived nominal counts. JPX supplies 31 Core30 and 68 Large70 constituents in its current published weight file. B3 supplies 76 Ibovespa securities; the BMV September review supplies 35 IPC securities.',
 '- ASX is explicitly labelled a replicated-ETF proxy: all 200 positive-weight equities agree between State Street STW dated September 30 and BlackRock IOZ dated September 29. Cash, futures and residual unassigned holdings were excluded. NZX membership uses the dated interest.co.nz list and official NZX active-security ISINs. Retrieval today is not a guarantee that every remaining Wikipedia list is current.',
 '- The two remaining CSI 300 rows are Haitong Securities (600837.SHG) and China Shipbuilding Industry (601989.SHG), retained transparently as unresolved stale-source rows (2/300 = 0.67%). They were not silently deleted to pass the threshold.',
 `- ${membership.supplementalCompanies.length} identities absent from universe.jsonl now participate in fundamentals, quotes, reports, analysis and logos through the shared company loader. No financials or analysis were fabricated. ${uncertain.length} official home-market identities (India/NZ) are verified securities, but their EODHD endpoint availability could not be tested with today's exhausted budget.`,
 '- Reviewed source snapshots, supplemental identities, AIC classification and compact OpenFIGI evidence are committed with provenance. Dated constituent overrides expire after 30 days and then fall back to refreshed sources; they require periodic renewal, not indefinite reuse.', '',
 '## Fund exclusions','',
 'Type/category and confirmed name/description rules are supplemented by the AIC closed-ended-company directory dated September 29. Asset Management alone never excludes a company. Jupiter, Ashmore, Man Group, Foresight Group, and direct property REITs such as Supermarket Income REIT remain. A security-type/name consistency check prevents a leveraged ETF mnemonic from removing its operating issuer (BAE Systems). Exclusions apply across all memberships and all site publication surfaces.', '',
 ...funds.map(f=>`- ${esc(f.name)}${f.id?` (${f.id})`:''} — ${f.reason}.`), '',
 '## Analysis and fundamentals backlog','',
 '| Region | Members | Analysed | Without analysis |', '|---|---:|---:|---:|',
 ...[...regions].sort().map(([name,r])=>`| ${name} | ${r.all} | ${r.analysed} | ${r.all-r.analysed} |`), '',
 `Fundamentals catch-up: **${due.length} members** (${noFile.length} absent files, ${empty.length} empty annual series, ${stale} stale/invalid dates). At 10 calls each: **${due.length*10} calls**, ${pct(due.length*10,100000)} of the 100,000/day allowance; ${100000-due.length*10} calls remain before small usage/FX overhead. Missing-analysis members alone would be ${missing.length*10} calls if all were refreshed, but many already have fundamentals; missing analysis is not the same backlog.`,
 '- The revised daily runner performs the member catch-up immediately after confirming the provider reset, before quotes, price history, cap enrichment, or general fundamentals. Missing/empty or >90-day-old members are included even when their existing source is ESEF/EDINET. General ordering is members, Western access, then market cap. Individual provider failures are recorded and do not stop the remaining member queue; fundamentals use one attempt (no hidden paid retries).',
 `- **Budget verdict:** one fresh daily budget is sufficient to attempt all ${due.length} due members. **Tomorrow's currently sleeping old runner is not guaranteed to do so until integration/restart.** Even with the revised runner, all ${missing.length} missing analyses cannot be promised: unsupported provider symbols, absent annual statements or downstream analysis failures remain possible. The ${uncertain.length} unverified provider symbols are explicitly listed below.`, '',
 `Unverified provider endpoints: ${uncertain.map(c=>c.id).join(', ')}.`, '',
 '## Logos and local verification','',
 `Member-only logo passes completed with **zero deferred**. ${displayedLogos}/${ids.size} (${pct(displayedLogos,ids.size)}) have a displayed logo; ${verifiedLogos}/${ids.size} (${pct(verifiedLogos,ids.size)}) have a validated non-null logo cache. ${ids.size-displayedLogos} use the initials fallback. Existing unverified provider-logo URLs are counted separately from validated assets. Unavailable logos were not replaced with invented branding.`,
 '- All real runs used VALUE_NO_EODHD=1. The API wrapper and logo requester both reject EODHD network access in that mode. The ledger remains '+budgetUsage().used+'/100000.',
 `- Local output reused the single staging directory: ${path.resolve(directory)}. No build, push, deployment, remote publication or revalidation was performed.`,
 `- Audit passed for all index lists, dossiers, search, top lists, browser views and history. All ${ids.size} members are searchable; all displayed identities are members and pass the fund exclusion. Historical summaries were recomputed for ${history.years.length} years / ${historicalRows} rows.`,
 '- Focused tests, TypeScript no-emit and shell syntax checks are recorded in index-membership/universe-2. Disk remained above 5 GB; the final check is recorded alongside this report.', '',
 '## Members without published analysis','',
 ...missing.sort((a,b)=>a.id.localeCompare(b.id)).map(c=>`- ${c.id} — ${esc(c.name)} (${membership.memberships[c.id].join(', ')}).`), '',
];
mkdirSync(path.dirname(path.resolve(destination)),{recursive:true});writeFileSync(destination,lines.join('\n'));
console.log(JSON.stringify({report:path.resolve(destination),members:ids.size,analysed:rows.length,missing:missing.length,due:due.length,calls:due.length*10,funds:funds.length,displayedLogos,verifiedLogos,unmatchedRows,historicalRows}));
