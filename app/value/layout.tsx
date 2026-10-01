import './value.css';
import './one-screen.css';
import './round-seven.css';
import './round-eight.css';
import './round-nine.css';
import './round-ten.css';
import './round-eleven.css';
import './round-twelve.css';
import './round-thirteen.css';
import './performance.css';
import './main-view.css';
import './round-fourteen.css';
import { BottomBar } from '@/components/value/BottomBar';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  metadataBase: new URL('https://value.gigainvestors.com'), title: 'Buffett checklist | GigaInvestors',
  description: '5 quality tests + price of business quality and price, with financial history and report evidence.',
};
export default async function ValueLayout({ children }: { children: React.ReactNode }) {
  return <main className="value-viz value-page">
    {children}
    <BottomBar/>

  </main>;
}
