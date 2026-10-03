import type { BrowserRow } from './browser-view';
import { matchesMarket } from './listing-details';
import { QUALITY_TESTS } from './types';

/** Shared by the result list and each prospective country/sector choice. */
export function matchesView(row: BrowserRow, filter: Record<string,string>): boolean {
  if (filter.country ? row.c !== filter.country : row.st === 'i' && filter.gate !== '0') return false;
  if (!matchesMarket(row,filter.markets??'')) return false;
  const search=filter.search??(!/^\d{4}Q[1-4]$/.test(filter.q??'')?filter.q:'');
  if (search && !`${row.nameEn??row.n} ${row.nameLocal??''} ${row.id}`.toLowerCase().includes(search.toLowerCase())) return false;
  const gate = filter.gate !== undefined && /^[0-6]$/.test(filter.gate) ? Number(filter.gate) : null;
  if (gate !== null) return row.t.slice(0, Math.min(gate, 5)) === 'P'.repeat(Math.min(gate, 5)) && (gate < 6 || row.b === true);
  if (filter.sector && row.s !== filter.sector) return false;
  if (filter.held === '1' && !row.h) return false;
  if ((filter.tags??'').split(',').filter(Boolean).some(tag=>!row.g.includes(tag))) return false;
  if (QUALITY_TESTS.some((key,i)=>filter[key] && row.t[i] !== (filter[key]==='pass'?'P':'F'))) return false;
  if (row.st === 'i') return !!filter.country;
  if (QUALITY_TESTS.some(key=>filter[key])) return true;
  if (filter.awaiting === '1') return /^[PCU]+$/.test(row.t) && row.t !== 'PPPPP';
  return row.t === 'PPPPP' || (filter.near === '1' && /^P*FP*$/.test(row.t));
}
