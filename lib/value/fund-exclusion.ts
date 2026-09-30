import { readCorpusJson } from './corpus';
import type { Company } from './types';
import directory from './closed-end-funds.json';
import { normalizedName } from './universe';
const fundName=(name:string)=>normalizedName(name).replace(/^the/,'').replace(/(?:investment)?trust$/,'');
const closedEndNames=new Set(directory.funds.filter(f=>!/^Property - (?:UK|Europe)/.test(f.sector)).map(f=>fundName(f.name)));
export interface SecurityClassification { Type?: string; Category?: string; GicIndustry?: string; GicSubIndustry?: string; Description?: string; }
/** Classification must describe a pooled vehicle, not merely its financial sector. */
export function nonOperatingReason(company: {name:string;industry?:string|null}, general: SecurityClassification = {}): string|null {
 const name=company.name??'';
 const property=/real estate investment trust/i.test(name)||/\bREIT\b/i.test(company.industry??'');
 if (/^(ETF|ETC|FUND|Mutual Fund|Closed[- ]End Fund|SPAC)$/i.test(general.Type??'')) return `provider type: ${general.Type}`;
 if (/closed[- ]?end|exchange.traded fund|fund of funds|investment trust/i.test(general.Category??'')) return `provider category: ${general.Category}`;
 if (/\b(?:SPAC|acquisition (?:corp(?:oration)?|company))\b/i.test(name)) return 'SPAC/acquisition company';
 // Management companies provide services to funds and are operating businesses.
 if (/\bfund(?:s)? (?:management|manager|services|administration)\b/i.test(name)) return null;
 if(closedEndNames.has(fundName(name))) return 'AIC closed-ended investment company directory';
 if (!property && /\b(?:investment trust|capital trust|income trust|fund(?:s)?|ETF)\b/i.test(name)) return 'pooled investment vehicle name';
 const sector=[general.GicIndustry,general.GicSubIndustry,company.industry].join(' ');
 if (/closed[- ]?end funds|asset management/i.test(sector) && /\b(?:investment|income|portfolio)\b.*\btrust\b/i.test(name)) return 'fund classification corroborated by trust name';
 if (/^.{0,130}?\b(?:is|operates as) (?:an? )?(?:(?:self-managed|closed?[- ]ended|open[- ]ended|equity|mutual|feeder|infrastructure|investment|private equity|and|venture capital)\s+){0,6}(?:fund\b|investment trust\b)/i.test(general.Description??'')) return 'provider description identifies a pooled investment vehicle';
 return null;
}
export function companyExclusion(company: Company): string|null {
 const raw=readCorpusJson<{General?:SecurityClassification}>(`raw/eodhd/${company.id}.json`);
 return nonOperatingReason(company,raw?.General);
}
