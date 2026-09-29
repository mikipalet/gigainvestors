'use client';
import { useState } from 'react';
import { ResultRow, type ResultEntry } from './ResultRow';
import { QualityLegend } from './QualityDots';
export type Sort = 'name' | 'country' | 'cap' | 'mos' | 'holders';
export const columns: Array<[Sort, string]> = [['name', 'Name'], ['country', 'Country'], ['cap', 'Market cap (USD)'], ['mos', 'Margin of safety'], ['holders', 'Holders']];
export function ResultsTable({ entries, sort, direction, sortBy }: { entries: ResultEntry[]; sort: Sort; direction: number; sortBy: (key: Sort) => void }) {
  const [scroll, setScroll] = useState(0);
  const virtual = entries.length > 60, rowHeight = 124;
  const start = virtual ? Math.min(Math.max(0, entries.length - 50), Math.max(0, Math.floor(scroll / rowHeight) - 10)) : 0;
  const visible = virtual ? entries.slice(start, start + 50) : entries;
  return <><QualityLegend /><p className="mb-2 text-[10px] text-ink/55">Margins use each company's latest close; each margin carries its price date. Last fiscal year is available in the dossier.</p><div data-testid="results-scroll" style={virtual ? { maxHeight: 650, overflowY: 'auto' } : undefined} onScroll={e => setScroll(e.currentTarget.scrollTop)}><table aria-rowcount={entries.length + 1} data-testid="results-table" className={`${virtual ? "value-virtual " : ""}w-full table-fixed text-left text-xs sm:table-auto sm:text-sm`}><thead><tr>{columns.map(([key, label]) => <th key={key} aria-sort={sort === key ? direction === 1 ? 'ascending' : 'descending' : 'none'} className={`border-b border-ink/20 px-1 py-3 sm:p-3 ${key === 'country' || key === 'holders' ? 'hidden sm:table-cell' : key === 'name' ? 'w-[44%] sm:w-auto' : ''}`}><button type="button" onClick={() => sortBy(key)}>{label}<span aria-hidden="true" className="ml-1 text-ink/55">{sort === key ? direction === 1 ? "↑" : "↓" : "↕"}</span></button></th>)}<th className="hidden border-b border-ink/20 p-3 sm:table-cell">Quality tests</th></tr></thead><tbody>{start > 0 && <tr aria-hidden="true"><td colSpan={6} style={{ height: start * rowHeight }}/></tr>}{visible.map((entry, i) => <ResultRow rowIndex={start + i + 2} key={entry.row.id} {...entry} />)}{virtual && start + visible.length < entries.length && <tr aria-hidden="true"><td colSpan={6} style={{ height: (entries.length - start - visible.length) * rowHeight }}/></tr>}</tbody></table></div></>;
}
