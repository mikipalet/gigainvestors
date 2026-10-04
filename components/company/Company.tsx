'use client';
import {AgentQuarterMetadata} from '@/components/AgentQuarterMetadata';
import {companyUrl} from '@/lib/agents/urls';
import {schemaJson,corporationSchema} from '@/lib/agents/schema';
import {companyMarkdown} from '@/lib/agents/company';
import {DossierContent} from '@/components/value/DossierContent';
import type {Dossier,PriceMap} from '@/lib/value/types';
import type {StockData} from '@/lib/types';
import {Holders,type InvestorMeta} from './Holders';
export function Company({dossier,quote,stock,investors}:{dossier:Dossier;quote:PriceMap[string]|null;stock:StockData|null;investors:InvestorMeta}){
 const holders=stock?<Holders stock={stock} investors={investors}/>:undefined;
 return <main className="value-viz value-page company-page"><AgentQuarterMetadata canonical={companyUrl(dossier.id)}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:schemaJson(corporationSchema(dossier))}}/><section className="sr-only" aria-label="Dated company data and chart values"><pre>{companyMarkdown(dossier,quote)}</pre></section><DossierContent dossier={dossier} quote={quote} holders={holders}/></main>;
}
