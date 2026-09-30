import { readCorpusJson, writeCorpusJson } from '../corpus';
import { freeCapData, type FreeCapData } from '../download-order';
import { currentShareInputs } from '../valuation-inputs';
import { sameCurrency } from '../currency';
import type { Company } from '../types';

type ShareInputs = { currentShares: number | null; reportedShares: boolean; shareSource?: 'yahoo-shares'; shareAssumptions: string[] };
const missing = (): ShareInputs => ({currentShares:null,reportedShares:false,shareAssumptions:[]});

/** Reuse the current-share cap/price sanity check; publication retains its stricter 2% verification gate. */
export function verifiedEsefShares(data: FreeCapData, capUsd: number | null, usdRate: number | null): ShareInputs {
  if (data.source !== 'Yahoo chart × verified shares' || ![data.price,data.shares,capUsd,usdRate].every(n=>typeof n==='number' && Number.isFinite(n) && n>0)) return missing();
  const checked = currentShareInputs({General:{CurrencyCode:data.currency},SharesStats:{SharesOutstanding:data.shares},Highlights:{MarketCapitalization:capUsd! / usdRate!}},data.price,data.currency);
  return checked.currentShares === null ? {...missing(),shareAssumptions:checked.shareAssumptions}
    : {...checked,shareSource:'yahoo-shares',shareAssumptions:['Share source: yahoo-shares; Yahoo reported shares pass the existing cap/price share-basis sanity check']};
}

export async function esefShareInputs(company: Company, usdRate: (currency:string)=>Promise<number|null>): Promise<ShareInputs> {
  const file = `raw/esef/shares/${company.id}.json`;
  const today = new Date().toISOString().slice(0,10);
  const cached = readCorpusJson<{date:string; data:FreeCapData}>(file);
  try {
    const cap = readCorpusJson<{version?:number; inputs?:FreeCapData}>(`raw/market-caps/${company.id}.json`);
    const data = cached?.date === today && cached.data ? cached.data
      : cap?.version === 2 && cap.inputs?.source === 'Yahoo chart × verified shares' && cap.inputs.shares ? cap.inputs
        : await freeCapData(company,null,true);
    const result = sameCurrency(data.currency,company.currency)
      ? verifiedEsefShares(data,company.marketCapUsd,await usdRate(company.currency)) : missing();
    writeCorpusJson(file,{date:today,source:'yahoo-shares',data,capUsd:company.marketCapUsd,accepted:result.currentShares!==null});
    return result;
  } catch (error) {
    writeCorpusJson(file,{date:today,source:'yahoo-shares',error:error instanceof Error?error.message:String(error)});
    return missing();
  }
}
