import {datasetSchema,schemaJson} from '@/lib/agents/schema';
import {siteUrl} from '@/lib/agents/urls';
import {pageAlternates} from '@/lib/agents/urls';
import { getIndex } from "@/lib/data";
import { Home } from "./Home";

export const dynamic = "force-static";
export const metadata = { alternates: {canonical:pageAlternates('main','/').canonical} };

export default async function Page() {
  const index = await getIndex();
  if (!index) return null;
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:schemaJson(datasetSchema("GigaInvestors 13F portfolios",siteUrl("main"),index.generatedAt,"Quarterly reported US securities holdings from SEC 13F filings via Dataroma; not complete portfolios or live prices."))}} />
      <Home index={index} />
    </main>
  );
}
