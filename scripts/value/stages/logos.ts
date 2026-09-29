import { loadCompanies, validCompanyId } from '../../../lib/value/companies';
import { readCorpusJson } from '../../../lib/value/corpus';
import { resolveLogo, writeNewJson, type Enrichment, type GeneralInfo } from '../../../lib/value/enrichment';
import { createLimiter, fetchWithRetry, pool } from '../../../lib/value/http';

/** Recover transient vendor failures without overwriting any existing enrichment. */
export default async function logos(options: {only?:string[];limit?:number} = {}) {
  const companies = loadCompanies(options), limit = createLimiter({perSecond:10});
  const stats = { checked:0, recovered:0, unavailable:0, cached:0 };
  await pool({items:companies,concurrency:8,run:async company=>{
    const patch=readCorpusJson<Enrichment>(`enrichment-v7/companies/${company.id}.json`);
    if (!patch || patch.logoSource==='eodhd') return;
    const file=`enrichment-v7/logos/${company.id}.json`;
    if (readCorpusJson(file)) { stats.cached++; return; }
    const general=[...new Set([company.id,...company.listings])].filter(id=>validCompanyId(id,'logos'))
      .map(id=>readCorpusJson<{General?:GeneralInfo}>(`raw/eodhd/${id}.json`)?.General).find(g=>g?.LogoURL);
    if (!general?.LogoURL) return;
    const resolved=await resolveLogo(general,async (url,init)=>fetchWithRetry(String(url),{
      ...init,signal:AbortSignal.timeout(60_000),retries:3,beforeAttempt:()=>limit(async()=>{}),
    }));
    if (resolved.source==='eodhd') {
      writeNewJson(file,{logo:resolved.logo,source:'eodhd',verifiedAt:new Date().toISOString()}); stats.recovered++;
    } else stats.unavailable++; // Failures are retriable; never pin a transient failure in this cache.
    if (++stats.checked%250===0) console.log(`logos: ${JSON.stringify(stats)}`);
  }});
  writeNewJson(`enrichment-v7/logo-runs/${Date.now()}.json`,stats);
  console.log(`logos: ${JSON.stringify(stats)}`);
  return stats;
}
