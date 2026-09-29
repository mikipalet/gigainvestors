import { ResultRow, type ResultEntry } from './ResultRow';
import { QualityLegend } from './QualityDots';
export type Sort = 'name' | 'country' | 'cap' | 'mos' | 'holders';
export const columns: Array<[Sort, string]> = [['name', 'Name'], ['country', 'Country'], ['cap', 'Market cap (USD)'], ['mos', 'Margin of safety'], ['holders', 'Holders']];
export function ResultsTable({ entries, sort, direction, sortBy }: { entries: ResultEntry[]; sort: Sort; direction: number; sortBy: (key: Sort) => void }) {
  return <><QualityLegend /><table className="w-full table-fixed text-left text-xs sm:table-auto sm:text-sm"><thead><tr>{columns.map(([key, label]) => <th key={key} aria-sort={sort === key ? direction === 1 ? 'ascending' : 'descending' : 'none'} className={`border-b border-ink/20 px-1 py-3 sm:p-3 ${key === 'country' || key === 'holders' ? 'hidden sm:table-cell' : key === 'name' ? 'w-[44%] sm:w-auto' : ''}`}><button type="button" onClick={() => sortBy(key)}>{label}</button></th>)}<th className="hidden border-b border-ink/20 p-3 sm:table-cell">Quality tests</th></tr></thead><tbody>{entries.map(entry => <ResultRow key={entry.row.id} {...entry} />)}</tbody></table></>;
}
