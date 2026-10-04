import type { Metadata } from 'next';
export const metadata: Metadata={title:'Buffett checklist | GigaInvestors',alternates:{canonical:'https://gigainvestors.com/value'}};
export default function ValueLayout({children}:{children:React.ReactNode}){return <main className="value-viz value-page">{children}</main>;}
