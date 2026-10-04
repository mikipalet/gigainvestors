import {websiteSchema,schemaJson} from '@/lib/agents/schema';
import { VALUE_PRODUCT_NAME, VALUE_PRODUCT_DESCRIPTION } from '@/lib/value/brand';
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
import './round-fifteen.css';
import './drawers.css';
import './filters.css';
import './judgement.css';
import './side-panel.css';
import './density.css';
import { BottomBar } from '@/components/value/BottomBar';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  metadataBase: new URL('https://value.gigainvestors.com'), title: `${VALUE_PRODUCT_NAME} | GigaInvestors`,
  description: VALUE_PRODUCT_DESCRIPTION,
  openGraph: { title: `${VALUE_PRODUCT_NAME} | GigaInvestors`, description: VALUE_PRODUCT_DESCRIPTION, siteName: VALUE_PRODUCT_NAME, url: 'https://value.gigainvestors.com' },
  twitter: { card: 'summary_large_image', title: VALUE_PRODUCT_NAME, description: VALUE_PRODUCT_DESCRIPTION },
};
export default async function ValueLayout({ children }: { children: React.ReactNode }) {
  return <main className="value-viz value-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:schemaJson(websiteSchema('value'))}} />
    {children}
    <BottomBar/>

  </main>;
}
