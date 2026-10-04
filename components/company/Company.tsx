'use client';
import {AgentQuarterMetadata} from '@/components/AgentQuarterMetadata';
import {companyUrl} from '@/lib/agents/urls';
import {schemaJson,corporationSchema} from '@/lib/agents/schema';
import {companyMarkdown} from '@/lib/agents/company';
import {HistoricalCompany} from './HistoricalCompany';
import {DossierContent} from '@/components/value/DossierContent';
import {Timeline} from '@/components/Timeline';
import {useQuarter} from '@/lib/use-quarter';
import type {Dossier,PriceMap} from '@/lib/value/types';
import type {StockData} from '@/lib/types';
import {Holders,type InvestorMeta} from './Holders';
export function Company({dossier,quote,stock,investors,quarters,initialQuarter}:{dossier:Dossier;quote:PriceMap[string]|null;stock:StockData|null;investors:InvestorMeta;quarters:string[];initialQuarter?:string}){
 const [q,setQ]=useQuarter(quarters,'Today',initialQuarter);
 const holders=stock?<Holders stock={stock} investors={investors} q={q} onQuarter={setQ}/>:undefined;
 return <main className="value-viz value-page company-page"><AgentQuarterMetadata canonical={companyUrl(dossier.id)} quarter={q==='Today'?undefined:q}/>{q==='Today'&&<><script type="application/ld+json" dangerouslySetInnerHTML={{__html:schemaJson(corporationSchema(dossier))}}/><section className="sr-only" aria-label="Dated company data and chart values"><pre>{companyMarkdown(dossier,quote)}</pre></section></>}{q==='Today'?<DossierContent dossier={dossier} quote={quote} holders={holders}/>:<HistoricalCompany dossier={dossier} q={q}>{holders}</HistoricalCompany>}<Timeline quarters={quarters} q={q} onChange={setQ}/></main>;
}
