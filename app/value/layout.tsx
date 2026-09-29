import './value.css';
import './one-screen.css';
import './round-seven.css';
import './round-eight.css';
import './round-nine.css';
import { getDefaultIndex } from '@/lib/value/store';
import { ValueLink } from '@/components/value/ValueLink';
import { SearchTrigger } from '@/components/Search';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  metadataBase: new URL('https://value.gigainvestors.com'), title: 'Buffett checklist | GigaInvestors',
  description: '5 quality tests + price of business quality and price, with financial history and report evidence.',
};
export default async function ValueLayout({ children }: { children: React.ReactNode }) {
  return <main className="value-viz value-page">
    <nav className="value-header"><ValueLink href="/" className="value-brand">GigaInvestors <span>· Value</span></ValueLink><SearchTrigger /><div><a href="https://gigainvestors.com">Portfolios ↗</a><ValueLink href="/method">Method</ValueLink></div></nav>
    {children}
    <footer className="value-bottom"><span>5 quality tests + price</span><span>Estimates, not guarantees · <ValueLink href="/method">Method & sources</ValueLink></span></footer>
  </main>;
}
