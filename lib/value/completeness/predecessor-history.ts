import type {PredecessorBasis, Year} from '../types';
import {emptyYear} from './second-sources';

type NumericField = {[K in keyof Year]-?: NonNullable<Year[K]> extends number ? K : never}[keyof Year];
type Observation={end:string;currency:string;values:Partial<Record<NumericField,number>>;labels?:Record<string,string>;derived?:NumericField[]};
type Disclosure=PredecessorBasis & {years:Observation[]};
const sodexo='https://tracks.sodexonet.com/files/live/sites/com-global/files/02%20PDF/Finance/Sodexo-Universal-Registration-Document-FY2020.pdf';
const prospectus='https://www.pluxeegroup.com/sites/g/files/jclxxe221/files/2024-01/Pluxee%20-%20Prospectus_compressed.pdf';
/** Parent business observations, never the parent's consolidated statements or shares.
 * Segment figures retain their historical perimeter and accounting basis. */
export const predecessorDisclosures:Record<string,Disclosure[]>={
 'SOLV.US':[{parent:'3M',segment:'Health Care',basis:'segment',source:'https://www.sec.gov/Archives/edgar/data/66740/000155837021000737/R28.htm',detail:'2020 Form 10-K Note 19, FY2019 recast segment data. Historical Health Care includes subsequently divested food safety and drug delivery; not a restated Solventum carve-out perimeter. Sales and profit include dual credit; corporate costs and special items are unallocated. Assets and D&A use the recast allocation basis. No parent cash flow, tax or shares allocated.',years:[
  {end:'2019-12-31',currency:'USD',values:{revenue:7431e6,operatingIncome:1858e6,capex:264e6,da:392e6,totalAssets:14790e6},labels:{operatingIncome:'Business segment operating income',revenue:'Segment net sales including dual credit',totalAssets:'Attributed segment assets'}},
 ]}],
 'PLX.PA':[
  {parent:'Sodexo',segment:'Benefits & Rewards Services',basis:'segment',source:`${sodexo}#page=109`,detail:'FY2020 report, p.107: total segment revenue includes inter-segment sales; underlying operating profit includes equity-accounted business profit and excludes other operating income/expenses. Segment assets and liabilities are not disclosed. Capex is a rounded sales ratio only.',years:[
   {end:'2019-08-31',currency:'EUR',values:{revenue:892e6,operatingIncome:276e6},labels:{operatingIncome:'Underlying operating profit'}},
   {end:'2020-08-31',currency:'EUR',values:{revenue:773e6,operatingIncome:202e6},labels:{operatingIncome:'Underlying operating profit'}},
  ]},
  {parent:'Sodexo',segment:'Benefits & Rewards Services',basis:'combined',source:`${prospectus}#page=164`,detail:'Prospectus combined accounts F-1, F-66. Identifies the combined FY2021–23 periods. Matching revenue is corroborated; later restated revenue, earnings and other statement fields retain their own values and sources.',years:[
   {end:'2021-08-31',currency:'EUR',values:{revenue:731e6}},
   {end:'2022-08-31',currency:'EUR',values:{revenue:842e6}},
   {end:'2023-08-31',currency:'EUR',values:{revenue:1052e6}},
  ]},
 ],
 'VLTO.US':[{parent:'Danaher',segment:'Environmental & Applied Solutions',basis:'segment',source:'https://www.danaher.com/sites/default/files/2023-08/danaher-2021-annual-report_1.pdf#page=85',detail:'2021 annual report, pp.82–83. Historical segment perimeter; unallocated corporate costs excluded. Identifiable assets are segment assets, not equity. Gross capital expenditures and D&A are disclosed separately.',years:[
  {end:'2019-12-31',currency:'USD',values:{revenue:4399e6,operatingIncome:1052e6,da:111e6,capex:54e6,totalAssets:4882e6},labels:{operatingIncome:'Segment operating profit',totalAssets:'Identifiable segment assets',capex:'Capital expenditures, gross'}},
 ]}],
 'FDXF.US':[{parent:'FedEx',segment:'FedEx Freight',basis:'segment',source:'https://investors.fedex.com/files/doc_financials/2022/ar/Annual-Report.pdf#page=114',detail:'FY2022 annual report pp.107–109: LTL Freight segment, not Express freight revenue. Operating income includes allocated FedEx Services costs; segment assets include intercompany receivables. Corporate costs remain unallocated.',years:[
  {end:'2020-05-31',currency:'USD',values:{revenue:7102e6,operatingIncome:580e6,da:381e6,capex:539e6,totalAssets:6434e6}},
  {end:'2021-05-31',currency:'USD',values:{revenue:7833e6,operatingIncome:1005e6,da:417e6,capex:320e6,totalAssets:7371e6}},
  {end:'2022-05-31',currency:'USD',values:{revenue:9532e6,operatingIncome:1663e6,da:406e6,capex:319e6,totalAssets:8904e6}},
 ]}],
 'SYENS.BR':[{parent:'Solvay',segment:'SpecialtyCo',basis:'combined',source:'https://www.syensqo.com/sites/g/files/alwlxe161/files/2023-11/_SpecialtyCo%20Registration%20Document.pdf#page=186',detail:'Registration document combined accounts F-3/F-5: total sales include EUR120m non-core revenue. Capex comprises EUR235m PP&E and EUR82m intangible purchases. D&A including impairment is not substituted for D&A. Parent shares are not carried over.',years:[
  {end:'2020-12-31',currency:'EUR',values:{revenue:5381e6,grossProfit:1560e6,costOfSales:3821e6,operatingIncome:-931e6,preTaxIncome:-1117e6,taxExpense:165e6,netIncome:-1285e6,totalNetIncome:-1282e6,ocf:1092e6,capex:317e6,leaseCash:55e6},labels:{capex:'PP&E purchases 235m + intangible purchases 82m',netIncome:'Profit attributable to SpecialtyCo'},derived:['capex']},
 ]}],
 'HONA.US':[{parent:'Honeywell',segment:'Aerospace',basis:'segment',source:'https://www.honeywell.com/content/dam/honeywellbt/en/documents/downloads/press-releases/4Q20-Press-Release-Financials.pdf#page=2',detail:'FY2020 full-year results, unaudited segment data: Aerospace net sales and segment profit. Profit excludes corporate, financing, stock compensation, pension and repositioning; includes affiliate equity income. No consolidated cash flow or shares allocated.',years:[
  {end:'2019-12-31',currency:'USD',values:{revenue:14054e6,operatingIncome:3607e6},labels:{operatingIncome:'Segment profit'}},
 ]},{parent:'Honeywell',segment:'Aerospace',basis:'segment',source:'https://www.sec.gov/Archives/edgar/data/773840/000077384023000013/R30.htm',detail:'FY2022 Form 10-K segment financial data. Segment profit excludes corporate costs, financing, stock compensation, pension and repositioning charges; includes affiliate equity income. Segment assets are not standalone equity.',years:[
  {end:'2020-12-31',currency:'USD',values:{revenue:11544e6,operatingIncome:2904e6,da:241e6,capex:248e6,totalAssets:11035e6},labels:{operatingIncome:'Segment profit'}},
  {end:'2021-12-31',currency:'USD',values:{revenue:11026e6,operatingIncome:3051e6,da:278e6,capex:284e6,totalAssets:11490e6},labels:{operatingIncome:'Segment profit'}},
  {end:'2022-12-31',currency:'USD',values:{revenue:11827e6,operatingIncome:3228e6,da:285e6,capex:246e6,totalAssets:12189e6},labels:{operatingIncome:'Segment profit'}},
 ]}],
 'SNDK.US':[{parent:'Western Digital',segment:'Flash-based products',basis:'segment',source:'https://www.sec.gov/Archives/edgar/data/106040/000010604021000040/wdc-20210702.htm',detail:'FY2021 Form 10-K, revenue by product: flash-based sales only; HDD is excluded. Annual 52/53-week periods ending July 3, 2020 and July 2, 2021. No allocation of consolidated operating profit, cash flow, capex or shares.',years:[
  {end:'2020-07-03',currency:'USD',values:{revenue:7769e6}},
  {end:'2021-07-02',currency:'USD',values:{revenue:8706e6}},
 ]}],
 'KALMAR.HE':[{parent:'Cargotec',segment:'Kalmar',basis:'segment',source:'https://www.kalmarglobal.com/49c38c/globalassets/ir/kalmar-corporation---demerger-and-listing-prospectus-22-may-2024.pdf#page=106',detail:'2024 listing prospectus p.103: audited historical segment total sales, including Navis and heavy cranes, consistent with the initial 2021 carve-out sales basis. Excluding those businesses is a separate unaudited series; no profit is inferred from sales.',years:[
  {end:'2019-12-31',currency:'EUR',values:{revenue:1722.6e6}},
  {end:'2020-12-31',currency:'EUR',values:{revenue:1529.2e6}},
 ]}],
 'TKMS.XETRA':[
  {parent:'thyssenkrupp',segment:'Marine Systems',basis:'segment',source:'https://ucpcdn.thyssenkrupp.com/_legacy/UCPthyssenkruppAG/assets.files/media/investoren/berichterstattung-publikationen/update-21.11.2019/en/thyssenkrupp-gb-2018-2019-en-web_neu.pdf#page=74',detail:'2018/19 annual report p.74: Marine Systems net sales and EBIT, rather than adjusted EBIT. Historical parent segment perimeter.',years:[
   {end:'2019-09-30',currency:'EUR',values:{revenue:1800e6,operatingIncome:0},labels:{operatingIncome:'EBIT'}},
  ]},
  {parent:'thyssenkrupp',segment:'Marine Systems',basis:'segment',source:'https://ucpcdn.thyssenkrupp.com/_binary/UCPthyssenkruppAG/9fee6ee8-a921-445a-b5b7-6be9c29d8446/thyssenkrupp-GB-en-2020-2021-Web.pdf#page=71',detail:'2020/21 annual report p.71: Marine Systems net sales and EBIT. Investments is not substituted for cash capital expenditure.',years:[
   {end:'2020-09-30',currency:'EUR',values:{revenue:1760e6,operatingIncome:15e6},labels:{operatingIncome:'EBIT'}},
   {end:'2021-09-30',currency:'EUR',values:{revenue:2022e6,operatingIncome:24e6},labels:{operatingIncome:'EBIT'}},
  ]},
 ],
 'SDZ.SW':[{parent:'Novartis',segment:'Sandoz',basis:'segment',source:'https://www.novartis.com/sites/novartiscom/files/novartis-annual-report-2020.pdf#page=218',detail:'2020 annual report F-20–22. Sales to third parties and IFRS segment operating income; corporate financing and tax are unallocated. Historical Sandoz perimeter. PP&E additions are not cash capital expenditure and are not substituted for it.',years:[
  {end:'2019-12-31',currency:'USD',values:{revenue:9731e6,operatingIncome:551e6},labels:{revenue:'Net sales to third parties',operatingIncome:'Operating income from continuing operations'}},
 ]}],
};

/** Add absent periods only. Never blend segment fields into an existing standalone
 * statement. Combined-period labels identify the filing basis; only equal source-checked facts receive field provenance. */
export function withPredecessorHistory(id:string,years:Year[]):Year[]{
 const result:Year[]=years.map(y=>({...y,provenance:{...y.provenance}}));
 for(const {years:observations,...basis} of predecessorDisclosures[id]??[])for(const observation of observations){
  const fy=Number(observation.end.slice(0,4));
  const existing=result.find(y=>y.fy===fy);
  if(existing && basis.basis==='segment')continue;
  if(existing && (existing.currency!==null && existing.currency!==observation.currency || existing.end!==observation.end))continue;
  if(existing?.currency===null && Object.entries(observation.values).some(([field,value])=>existing[field as keyof Year]!==value))continue;
  const y=existing??{...emptyYear(observation.end,observation.currency),...observation.values};
  y.predecessor=basis;y.provenance??={};
  if(y.currency===null){y.currency=observation.currency;y.provenance.currency={source:basis.source,field:'Presentation currency',method:'reported',inputs:[basis.detail]};}
  for(const field of Object.keys(observation.values).filter(field=>!existing||existing[field as keyof Year]===observation.values[field as NumericField]))y.provenance[field]={source:basis.source,field:observation.labels?.[field]??field,method:observation.derived?.includes(field as NumericField)?'derived':'reported',inputs:[basis.parent,basis.segment,basis.basis,basis.detail]};
  if(!existing)result.push(y);
 }
 return result.sort((a,b)=>a.fy-b.fy);
}
