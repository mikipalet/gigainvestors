'use client';
import { displayName } from '@/lib/value/presentation';
import { usePathname } from 'next/navigation';
import { ValueLink } from './ValueLink';
import { SearchInput } from '../Search';

export function NotFoundRecovery({ companies, analysed, universe }: { companies: Array<{id:string;n:string}>; analysed: number; universe: number }) {
  const ticker = usePathname().split('/').at(-1)?.split('.')[0] ?? '';
  const suggestions = companies.filter(c => c.id.toLowerCase().startsWith(ticker.slice(0,2).toLowerCase()) || c.n.toLowerCase().includes(ticker.toLowerCase())).slice(0,3);
  return <section className="not-found-value">
    <p className="eyebrow">Outside the current coverage</p><h1>Company not found</h1>
    <p>Try a ticker and exchange, such as KO.US. We have analysed {analysed.toLocaleString('en-US')} of {universe.toLocaleString('en-US')} listed companies; a missing dossier does not mean a business failed the tests.</p>
    <SearchInput query={usePathname().split('/').at(-1)?.toUpperCase()??ticker} />
    {suggestions.length > 0 && <><h2>Did you mean</h2><ul>{suggestions.map(c=><li key={c.id}><ValueLink href={`/${c.id.toLowerCase()}`}>{displayName(c.n)} <span>{c.id.toUpperCase()} →</span></ValueLink></li>)}</ul></>}
    <h2>Explore covered companies</h2><ul>{[['ko.us','Coca-Cola'],['aapl.us','Apple'],['cb.us','Chubb'],['pool.us','Pool'],['dal.us','Delta Air Lines']].map(([id,name])=><li key={id}><ValueLink href={`/${id}`}>{name} <span>{id.toUpperCase()} →</span></ValueLink></li>)}</ul>
    <ValueLink href="/">← Return to the checklist and current coverage</ValueLink><p><a href={`mailto:hello@gigainvestors.com?subject=${encodeURIComponent(`Value company request: ${ticker.toUpperCase()}`)}`}>Request a company ↗</a></p>
  </section>;
}
