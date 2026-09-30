import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadCompanies } from '../../../lib/value/companies';
import { readCorpusJson, readJsonl } from '../../../lib/value/corpus';
import { cleanName, englishName, aboutSentence, parseEdinetNames, resolveLogo, generalInfoFor, yahooEnglishName, writeNewJson, type Enrichment } from '../../../lib/value/enrichment';
import type { Company } from '../../../lib/value/types';
import { pool } from '../../../lib/value/http';

async function edinetNames(): Promise<Record<string, string>> {
  const file = 'enrichment-v7/edinet-names.json';
  const cached = readCorpusJson<Record<string, string>>(file);
  if (cached) return cached;
  const response = await fetch('https://disclosure2dl.edinet-fsa.go.jp/searchdocument/codelist/Edinetcode.zip', { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`EDINET code list HTTP ${response.status}`);
  const temp = mkdtempSync(path.join(os.tmpdir(), 'value-edinet-names-'));
  try {
    const zip = path.join(temp, 'code.zip'); writeFileSync(zip, Buffer.from(await response.arrayBuffer()));
    const csv = execFileSync('unzip', ['-p', zip, 'EdinetcodeDlInfo.csv'], { maxBuffer: 20 * 1024 * 1024 });
    const names = parseEdinetNames(new TextDecoder('shift_jis').decode(csv));
    writeNewJson(file, names); return names;
  } finally { rmSync(temp, { recursive: true, force: true }); }
}

/** Only new enrichment-v7 files are written. Existing caches are immutable. */
export default async function enrich(options: { only?: string[]; limit?: number } = {}) {
  const companies = loadCompanies(options);
  const originals = new Map(readJsonl<Company>('universe.jsonl').map(c=>[c.id,c.name]));
  const names = companies.some(c => c.country === 'JP') ? await edinetNames() : {};
  const stats = { companies: companies.length, cached: 0, namesFixed: 0, edinet: 0, eodhd: 0, yahoo: 0, unresolved: 0, logos: 0, eodhdLogos: 0, favicons: 0, about: 0 };
  let completed = 0;
  await pool({ items: companies, concurrency: 20, run: async company => {
    const file = `enrichment-v7/companies/${company.id}.json`;
    let patch = readCorpusJson<Enrichment>(file);
    if (patch) stats.cached++;
    else {
      const general = generalInfoFor(company);
      const edinet = company.edinetCode ? names[company.edinetCode] ?? null : null;
      let display = englishName(company, general, edinet);
      let source = display.nameEn === company.id ? 'unresolved' : edinet && display.nameEn === cleanName(edinet) ? 'edinet' : 'eodhd';
      if (source === 'unresolved') {
        const yahoo = await yahooEnglishName(company);
        display = englishName(company, general, edinet, yahoo);
        if (display.nameEn !== company.id) source = 'yahoo';
      }
      const logo = await resolveLogo(general);
      patch = { ...display, logo: logo.logo, logoSource: logo.source, about: aboutSentence(general.Description ?? company.description), nameSource: source };
      writeNewJson(file, patch);
    }
    const aboutFile = `enrichment-v7/about/${company.id}.json`;
    const about = readCorpusJson<{about:string}>(aboutFile)?.about
      ?? (!patch.about ? aboutSentence(generalInfoFor(company).Description ?? company.description) : null);
    if (about) { writeNewJson(aboutFile,{about}); patch = {...patch,about}; }
    const verified = readCorpusJson<{logo:string|null;source?:string}>(`enrichment-v7/logos/${company.id}.json`);
    if (verified?.logo) patch = {...patch,logo:verified.logo,logoSource:verified.source??"eodhd"};
    if (patch.nameEn !== originals.get(company.id) && patch.nameEn !== company.id) stats.namesFixed++;
    if (patch.nameSource in stats) stats[patch.nameSource as 'edinet' | 'eodhd' | 'yahoo' | 'unresolved']++;
    if (patch.logo) stats.logos++;
    if (patch.logoSource === 'eodhd') stats.eodhdLogos++;
    if (patch.logoSource === 'favicon') stats.favicons++;
    if (patch.about) stats.about++;
    if (++completed % 1000 === 0) console.log(`enrich: ${completed}/${companies.length}`);
  } });
  const report = { ...stats, logoPercent: companies.length ? 100 * stats.logos / companies.length : 0, asOf: new Date().toISOString() };
  writeNewJson(`enrichment-v7/runs/${Date.now()}.json`, report);
  console.log(`enrich: ${JSON.stringify(report)}`);
  return report;
}
