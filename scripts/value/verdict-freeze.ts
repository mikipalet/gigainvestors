import {existsSync, readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {appendJsonl, readCorpusJson} from '../../lib/value/corpus';
import {validCompanyId} from '../../lib/value/companies';
import {shardOf} from '../../lib/value/shard';
import {summarizeSnapshots} from '../../lib/value/snapshots';
import {storyFromFunnel} from '../../lib/value/story';
import {assertIndexConsistency} from '../../lib/value/consistency';
import type {Dossier, IndexRow, StoreMeta, SnapshotRow, PublishedFunnel, FunnelCounts} from '../../lib/value/types';

type Files = Record<string, any>;

/** Capture the live rows before writeOutput removes/replaces their containing files. */
export function readVerdictFreeze(repo: string) {
  const config = readCorpusJson<{version:number;ids:string[]}>('verdict-freeze.json');
  if (config && (config.version !== 1 || !Array.isArray(config.ids) || config.ids.some(id => typeof id !== 'string' || !validCompanyId(id, 'publish')) || new Set(config.ids).size !== config.ids.length)) throw Error('Invalid verdict-freeze.json');
  const ids = new Set(config?.ids ?? []), previous: Files = {}, dossiers: Record<string,Dossier> = {};
  if (!ids.size) return {ids, previous, dossiers};
  for (const dir of ['dossiers','index','search','history']) {
    if (!existsSync(path.join(repo,dir))) continue;
    for (const file of readdirSync(path.join(repo,dir)).filter(f=>f.endsWith('.json'))) previous[`${dir}/${file}`] = JSON.parse(readFileSync(path.join(repo,dir,file),'utf8'));
  }
  if (existsSync(path.join(repo,'aliases.json'))) previous['aliases.json']=JSON.parse(readFileSync(path.join(repo,'aliases.json'),'utf8'));
  for (const id of ids) {
    const dossier=previous[`dossiers/${shardOf(id)}.json`]?.[id];
    if (!dossier || dossier.id!==id) throw Error(`Frozen company ${id}: previous live dossier missing`);
    dossiers[id]=dossier;
  }
  return {ids,previous,dossiers};
}

/** Replace in place; a freeze must not reshuffle every other historical/search row. */
function restoreRows(current:any[], previous:any[], ids:Set<string>, key:(row:any)=>string):any[] {
  const old=new Map(previous.filter(row=>ids.has(key(row))).map(row=>[key(row),row]));
  const seen=new Set<string>();
  const rows=current.flatMap(row=>{
    const id=key(row);seen.add(id);
    return ids.has(id)?old.has(id)?[old.get(id)]:[]:[row];
  });
  previous.forEach((row,index)=>{const id=key(row);if(ids.has(id)&&!seen.has(id))rows.splice(Math.min(index,rows.length),0,row);});
  return rows;
}

export function applyVerdictFreeze(files: Files, freeze: ReturnType<typeof readVerdictFreeze>): void {
  const {ids,previous,dossiers}=freeze;
  if (!ids.size) return;
  // Fail closed if routing changed: preserving shard rows alone would then hide identities.
  if (previous['search/manifest.json'] && JSON.stringify(previous['search/manifest.json'])!==JSON.stringify(files['search/manifest.json'])) throw Error('Frozen search routing changed; reconcile the prior search manifest before publication');
  for (const file of new Set([...Object.keys(files),...Object.keys(previous)])) {
    const old=previous[file];
    if (/^dossiers\//.test(file)) {
      const current=files[file]??={};
      for (const id of ids) {delete current[id];if(old?.[id])current[id]=old[id];}
    } else if (/^index\//.test(file) || /^history\/(?:companies|\d{4}(?:Q[1-4])?)\.json$/.test(file)) {
      const key=(row:any)=>Array.isArray(row)?row[0]:row.id;
      files[file]=restoreRows(files[file]??[],old??[],ids,key);
    } else if (/^search\//.test(file) && file!=='search/manifest.json') {
      const current=files[file]??{rows:[],aliases:{}};
      const rows=restoreRows(current.rows,old?.rows??[],ids,r=>r[0]), aliases:Record<string,number[]>={};
      const offsets=new Map(rows.map((row,i)=>[row[0],i]));
      for (const [shard,keep] of [[current,false],[old,true]] as const) {
        if (!shard) continue;
        for (const [alias,indices] of Object.entries(shard.aliases) as [string,number[]][]) for (const index of indices) {
          const id=shard.rows[index][0],offset=offsets.get(id);
          if(ids.has(id)===keep&&offset!==undefined)(aliases[alias]??=[]).push(offset);
        }
      }
      files[file]={rows,aliases};
      if(Buffer.byteLength(JSON.stringify(files[file])+'\n')>60_000)throw Error(`Frozen search shard exceeds byte budget: ${file}`);
    }
  }
  const aliases=files['aliases.json']??={};
  for(const [alias,id] of Object.entries(aliases))if(ids.has(id as string))delete aliases[alias];
  for(const [alias,id] of Object.entries(previous['aliases.json']??{}))if(ids.has(id as string))aliases[alias]=id;
  // Summaries and browser views must describe the restored rows, not rejected analyses.
  const history=files['history/index.json'];
  if(history){
    const identities=files['history/companies.json']??[];
    const western=new Set(identities.filter((r:IndexRow)=>r.w).map((r:IndexRow)=>r.id));
    history.years=[...new Set([...history.years,...Object.keys(files).flatMap(f=>/^history\/(\d{4})\.json$/.exec(f)?.slice(1).map(Number)??[])])].sort();
    history.quarters=[...new Set([...(history.quarters??[]),...Object.keys(files).flatMap(f=>/^history\/(\d{4}Q[1-4])\.json$/.exec(f)?.slice(1)??[])])].sort();
    history.western??={perYear:{},perQuarter:{}};
    for(const [periods,summary] of [[history.years,'perYear'],[history.quarters,'perQuarter']] as const){
      history[summary]={};history.western[summary]={};
      for(const period of periods){const rows=files[`history/${period}.json`]??[];history[summary][period]=summarizeSnapshots(rows);history.western[summary][period]=summarizeSnapshots(rows.filter((r:SnapshotRow)=>western.has(r[0])));}
    }
  }
  const meta=files['meta.json'] as StoreMeta;
  const rows=Object.entries(files).filter(([f])=>/^index\/[A-Z]{2}\.json$/.test(f)).flatMap(([,rows])=>rows as IndexRow[]);
  const allDossiers=Object.assign({},...Object.entries(files).filter(([f])=>f.startsWith('dossiers/')).map(([,data])=>data)) as Record<string,Dossier>;
  const empty=():FunnelCounts=>({asOf:null,analysed:0,gates:meta.funnel!.gates.map(g=>({...g,passing:0,pass:0,fail:0,checking:0,unclear:0,failsOnlyThis:0}))});
  const funnel:PublishedFunnel={...empty(),byCountry:{}},western:PublishedFunnel={...empty(),byCountry:{}};
  for(const row of rows){
    const d=allDossiers[row.id],price=d.tests.price;
    const pass=[...row.t].map(c=>row.st==='s'&&c==='P').concat(row.b===true);
    const fail=[...row.t].map(c=>c==='F').concat(row.businessChanged===true||price?.result==='fail'||price?.metrics.mos!=null&&price.result!=='pass');
    for(const f of [funnel,funnel.byCountry[row.c]??=empty(),...(row.w?[western,western.byCountry[row.c]??=empty()]:[])]){
      f.analysed++;if(f.asOf===null||d.asOf>f.asOf)f.asOf=d.asOf;
      let cumulative=true;
      f.gates.forEach((g,i)=>{if(cumulative){if(pass[i]){g.passing++;g.pass!++;}else if(fail[i])g.fail!++;else if(row.t[i]==='C')g.checking!++;else g.unclear!++;}cumulative&&=pass[i];if(row.st==='s'&&fail[i]&&pass.slice(0,5).every((p,j)=>j===i||p))g.failsOnlyThis++;});
    }
  }
  meta.funnel=funnel;meta.story=storyFromFunnel(funnel);meta.western={funnel:western,story:storyFromFunnel(western)};
  meta.counts={...meta.counts,analysed:rows.length,scored:rows.filter(r=>r.st==='s').length,insufficient:rows.filter(r=>r.st==='i').length};
  assertIndexConsistency({meta,rows:files['index/default.json']});
  for(const id of ids)appendJsonl('staging/verdict-freeze.jsonl',{at:new Date().toISOString(),id,reason:'frozen until second-source check',publishedAsOf:dossiers[id].asOf});
}
