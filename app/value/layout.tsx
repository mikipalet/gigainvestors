import type {Metadata} from 'next';
import {websiteSchema,schemaJson} from '@/lib/agents/schema';
import {VALUE_PRODUCT_NAME,VALUE_PRODUCT_DESCRIPTION} from '@/lib/value/brand';
import {pageAlternates} from '@/lib/agents/urls';
export const metadata:Metadata={title:`${VALUE_PRODUCT_NAME} | GigaInvestors`,description:VALUE_PRODUCT_DESCRIPTION,alternates:pageAlternates('value','/'),openGraph:{title:`${VALUE_PRODUCT_NAME} | GigaInvestors`,description:VALUE_PRODUCT_DESCRIPTION,siteName:VALUE_PRODUCT_NAME,url:'https://gigainvestors.com/value'},twitter:{card:'summary_large_image',title:VALUE_PRODUCT_NAME,description:VALUE_PRODUCT_DESCRIPTION}};
export default function ValueLayout({children}:{children:React.ReactNode}){return <main className="value-viz value-page"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:schemaJson(websiteSchema('value'))}}/>{children}</main>;}
