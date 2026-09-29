import './value.css';
import { getDefaultIndex } from '@/lib/value/store';
import { ValueLink } from '@/components/value/ValueLink';
import { CompanySearch } from '@/components/value/CompanySearch';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  metadataBase: new URL('https://value.gigainvestors.com'), title: 'Buffett checklist | GigaInvestors',
  description: 'Six independent tests of business quality and price, with financial history and report evidence.',
};
export default async function ValueLayout({ children }: { children: React.ReactNode }) {
  const companies = (await getDefaultIndex()).map(({id,n})=>({id,n}));
  return <main className="value-viz value-page">
    <nav className="value-header"><ValueLink href="/" className="value-brand">GigaInvestors <span>· Value</span></ValueLink><CompanySearch companies={companies} /><div><a href="https://gigainvestors.com">Portfolios ↗</a><ValueLink href="/method">Method</ValueLink></div></nav>
    {children}
    <footer className="value-footer"><span>GigaInvestors · Independent tests. No blended score.</span><span>Estimates depend on assumptions; they are not guarantees or investment advice. <ValueLink href="/method">Method & sources</ValueLink> · <a href="mailto:hello@gigainvestors.com">Contact</a></span></footer>
  </main>;
}
