import { Parser } from 'htmlparser2';
import { emptyYear } from '../completeness/second-sources';
import type { Year } from '../types';

export interface IndiaFiling {
  symbol: string; consolidated: string; audited: string; period: string;
  fromDate: string; toDate: string; filingDate: string; seqNumber: string;
  xbrl: string | null; resultDetailedDataLink: string | null;
  params?:string; industry?:string; reInd?:string; format?:string; oldNewFlag?:string;
}
import {indiaDepositarySymbols as aliases} from './symbols';
// The NSE archive rewrites historical list symbols after renames; the filed
// documents retain these old symbols. These are explicit issuer aliases only.
export const historicalIndiaSymbols:Record<string,string[]>={ETERNAL:['ZOMATO'],TMPV:['TATAMOTORS'],TATACONSUM:['TATAGLOBAL','TATATEA'],SHRIRAMFIN:['SRTRANSFIN']};
function sameIssuer(symbol:string,reported:string):boolean{return reported===symbol||(historicalIndiaSymbols[symbol]??[]).includes(reported);}
export function indiaSymbol(id: string): string {
  if (aliases[id]) return aliases[id];
  if (/^[A-Z0-9&-]+\.NSE$/.test(id)) return id.slice(0,-4);
  throw new Error(`No verified India symbol for ${id}`);
}
export function indiaDate(value: string): string {
  const m = /^(\d{2})-([A-Za-z]{3})-(\d{4})$/.exec(value);
  if (!m) throw new Error(`Invalid NSE date: ${value}`);
  const month = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[2].toLowerCase())+1;
  const date = `${m[3]}-${String(month).padStart(2,'0')}-${m[1]}`;
  if (!month || new Date(date).toISOString().slice(0,10) !== date) throw new Error('Invalid NSE date');
  return date;
}
export function filingUrl(f: IndiaFiling): string | null {
  const valid = (url: string | null, extension: string) => {
    if (!url) return false;
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'nsearchives.nseindia.com' && u.pathname.endsWith(extension);
  };
  if (valid(f.xbrl,'.xml')) return f.xbrl;
  if (valid(f.resultDetailedDataLink,'.html')) return f.resultDetailedDataLink;
  if(f.params&&f.seqNumber&&f.format)return detailUrl(f);
  return null;
}
export function detailUrl(f:IndiaFiling):string{
  return 'https://www.nseindia.com/api/corporates-financial-results-data?'+new URLSearchParams({index:'equities',params:f.params??'',seq_id:f.seqNumber,industry:f.industry??'-',frOldNewFlag:f.oldNewFlag??'',ind:f.reInd??'',format:f.format??''});
}
export function selectIndiaFilings(rows: IndiaFiling[], symbol: string): IndiaFiling[] {
  const selected = new Map<string,IndiaFiling>();
  for (const row of rows) {
    if (row.symbol !== symbol || row.consolidated !== 'Consolidated' || row.audited !== 'Audited' || row.period !== 'Annual' || !filingUrl(row)) continue;
    const days = (Date.parse(indiaDate(row.toDate))-Date.parse(indiaDate(row.fromDate)))/86400000;
    if (days < 330 || days > 400) continue;
    const prior = selected.get(row.toDate);
    if (!prior || Number(row.seqNumber) > Number(prior.seqNumber)) selected.set(row.toDate,row);
  }
  return [...selected.values()].sort((a,b)=>indiaDate(a.toDate).localeCompare(indiaDate(b.toDate)));
}

interface Element { name: string; attrs: Record<string,string>; text: string; children: Element[] }
const local = (s: string) => s.split(':').at(-1)!;
function document(text: string, xml: boolean): Element {
  if (xml && /<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('External XML declarations are not supported');
  const root: Element = {name:'root',attrs:{},text:'',children:[]}, stack = [root];
  const parser = new Parser({
    onopentag(name,attrs) { const node = {name:local(name),attrs,text:'',children:[]}; stack.at(-1)!.children.push(node); stack.push(node); },
    ontext(text) { stack.at(-1)!.text += text; },
    onclosetag() { if (stack.length > 1) stack.pop(); },
  }, { xmlMode:xml, decodeEntities:true });
  parser.write(text); parser.end(); return root;
}
function descendants(e: Element): Element[] { return e.children.flatMap(c=>[c,...descendants(c)]); }
function content(e: Element): string { return [e.text,...e.children.map(content)].join(' ').replace(/\s+/g,' ').trim(); }
export function integratedAnnualFiling(xml:string,row:{symbol:string;qe_Date:string;audited?:string;consolidated:string;xbrl:string;seq_Id?:string}):IndiaFiling|null{
  if(row.consolidated!=='Consolidated')return null;
  const nodes=descendants(document(xml,true));
  const value=(name:string)=>nodes.find(n=>n.name===name)?.text.trim();
  const start=value('DateOfStartOfFinancialYear'),end=value('DateOfEndOfFinancialYear');
  if(!start||!end||end!==indiaDate(row.qe_Date))return null;
  const days=(Date.parse(end)-Date.parse(start))/86400000;if(days<330||days>400)return null;
  const nseDate=(iso:string)=>`${iso.slice(8,10)}-${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(iso.slice(5,7))-1]}-${iso.slice(0,4)}`;
  // The index describes Q4, whose audit status can differ from the annual column.
  // parseIndiaXbrl still requires an explicitly audited matching annual context.
  return {symbol:row.symbol,consolidated:row.consolidated,audited:'Audited',period:'Annual',fromDate:nseDate(start),toDate:nseDate(end),filingDate:'',seqNumber:row.seq_Id??'',xbrl:row.xbrl,resultDetailedDataLink:null};
}
const durationTags: Record<string,string[]> = {
  revenue:['RevenueFromOperations'], totalIncome:['Income'],
  netIncome:['ProfitOrLossAttributableToOwnersOfParent','ProfitLossAfterTaxesMinorityInterestAndShareOfProfitLossOfAssociates'],
  totalNetIncome:['ProfitLossForPeriod','ProfitLossForThePeriod'],
  preTaxIncome:['ProfitBeforeTax','ProfitLossFromOrdinaryActivitiesBeforeTax'], taxExpense:['TaxExpense'],
  interestExpense:['FinanceCosts','InterestExpended'], interestIncome:['InterestEarned'],
  da:['DepreciationDepletionAndAmortisationExpense','AdjustmentsForDepreciationAndAmortisationExpense'],
  ocf:['CashFlowsFromUsedInOperatingActivities'], sbc:['AdjustmentsForSharebasedPayments'],
  nonRecurring:['ExceptionalItemsBeforeTax','ExceptionalItems'],
  dividendsPaid:['DividendsPaidClassifiedAsFinancingActivities'],
  buybacks:['PaymentsToAcquireOrRedeemEntitysShares'],
  issuance:['ProceedsFromIssuingSharesClassifiedAsFinancingActivities','ProceedsFromIssuingShares'],
  acquisitions:['CashFlowsUsedInObtainingControlOfSubsidiariesOrOtherBusinessesClassifiedAsInvestingActivities'],
  dilutedEps:['DilutedEarningsLossPerShareFromContinuingAndDiscontinuedOperations','DilutedEarningsPerShareAfterExtraordinaryItems'],
  basicEps:['BasicEarningsLossPerShareFromContinuingAndDiscontinuedOperations','BasicEarningsPerShareAfterExtraordinaryItems'],
  dilutedShares:['WeightedAverageNumberOfDilutedSharesOutstanding'],
  operatingIncome:['OperatingProfitBeforeProvisionAndContingencies'],
  nonInterestExpense:['OperatingExpenses'], creditLossProvision:['ProvisionsOtherThanTaxAndContingencies'],
  leaseCash:['PaymentsOfLeaseLiabilitiesClassifiedAsFinancingActivities'],
};
const instantTags: Record<string,string[]> = {
  equity:['EquityAttributableToOwnersOfParent'], minorityInterest:['NonControllingInterest'],
  totalAssets:['Assets'], totalLiabilities:['Liabilities'], liabilitiesAndStockholdersEquity:['EquityAndLiabilities','CapitalAndLiabilities'],
  currentAssets:['CurrentAssets'],currentLiabilities:['CurrentLiabilities'],
  goodwill:['Goodwill'],intangibles:['OtherIntangibleAssets'],inventory:['Inventories'],
  ppe:['PropertyPlantAndEquipment','FixedAssets'],cashAndCashEquivalents:['CashAndCashEquivalents'],
  shortTermInvestments:['CurrentInvestments'],shortTermDebt:['BorrowingsCurrent'],totalDebt:['Borrowings'],
  deposits:['Deposits'],loans:['Advances'],retainedEarnings:['RetainedEarnings'],
};
const spent = new Set(['capex','dividendsPaid','buybacks','acquisitions','leaseCash']);

/** NSE-generated facts are absolute units. `decimals` and display rounding never scale them. */
export function parseIndiaXbrl(xml: string, filing: IndiaFiling): Year[] {
  if (filing.consolidated !== 'Consolidated') throw new Error('Expected consolidated filing');
  const nodes = descendants(document(xml,true));
  const contexts = new Map(nodes.filter(n=>n.name==='context').map(c=>[c.attrs.id,c]));
  const units = new Map(nodes.filter(n=>n.name==='unit').map(u=>[u.attrs.id,descendants(u).filter(n=>n.name==='measure').map(n=>local(n.text))]));
  const facts = nodes.filter(n=>n.attrs.contextRef);
  const symbols = facts.filter(n=>n.name==='Symbol').map(n=>n.text.trim());
  const identifiers = nodes.filter(n=>n.name==='identifier' && /NSESymbol/.test(n.attrs.scheme??'')).map(n=>n.text.trim());
  if (![...symbols,...identifiers].length || [...symbols,...identifiers].some(s=>!sameIssuer(filing.symbol,s))) throw new Error('NSE filing identity mismatch');
  if (facts.some(n=>n.name==='DescriptionOfPresentationCurrency' && n.text.trim()!=='INR')) throw new Error('Expected INR filing');
  const end = indiaDate(filing.toDate), start = indiaDate(filing.fromDate);
  const yearly=facts.find(n=>n.name==='ReportingQuarter')?.text.trim()==='Yearly';
  const fiscalStart=facts.find(n=>n.name==='DateOfStartOfFinancialYear')?.text.trim();
  const fiscalEnd=facts.find(n=>n.name==='DateOfEndOfFinancialYear')?.text.trim();
  const annualStart=(id:string)=>id==='FourD'&&yearly&&fiscalStart===start&&fiscalEnd===end?fiscalStart:undefined;
  // NSE's WEB conversion drops the non-dimensional base contexts altogether.
  // Only its reserved base ids are recoverable, and only from explicit period facts.
  for (const id of ['OneD','FourD']) {
    if (contexts.has(id)) continue;
    const from=facts.find(n=>n.name==='DateOfStartOfReportingPeriod'&&n.attrs.contextRef===id)?.text.trim()??annualStart(id);
    const to=facts.find(n=>n.name==='DateOfEndOfReportingPeriod'&&n.attrs.contextRef===id)?.text.trim();
    if (!from||to!==end) continue;
    contexts.set(id,{name:'context',attrs:{id},text:'',children:[{name:'startDate',attrs:{},text:from,children:[]},{name:'endDate',attrs:{},text:to,children:[]}]});
    const instantId=id.replace(/D$/,'I');
    if(!contexts.has(instantId))contexts.set(instantId,{name:'context',attrs:{id:instantId},text:'',children:[{name:'instant',attrs:{},text:to,children:[]}]});
  }
  const y: Year = {...emptyYear(end,'INR'),interestIncome:null,tangibleEquity:null,provenance:{}};
  const annual: string[] = [], instant: string[] = [];
  for (const [id,ctx] of contexts) {
    const parts = descendants(ctx);
    if (parts.some(n=>n.name==='explicitMember'||n.name==='typedMember')) continue;
    const value = (name: string) => parts.find(n=>n.name===name)?.text.trim();
    if (value('instant') === end) instant.push(id);
    // Recorded NSE exporter defect: FourD context is Q4, but the explicit reporting
    // dates identify the audited annual figures. Require exact agreement with list metadata.
    const metadata = (name: string) => facts.find(n=>n.attrs.contextRef===id&&n.name===name)?.text.trim();
    const from = metadata('DateOfStartOfReportingPeriod') ?? annualStart(id) ?? value('startDate');
    const to = metadata('DateOfEndOfReportingPeriod') ?? value('endDate');
    if (from !== start || to !== end) continue;
    if (metadata('NatureOfReportStandaloneConsolidated') !== 'Consolidated') throw new Error('Expected consolidated annual facts');
    if (metadata('WhetherResultsAreAuditedOrUnaudited') !== 'Audited') continue;
    annual.push(id);
  }
  if (!annual.length) throw new Error('No matching audited annual context');
  const pick = (tags: string[], stock = false): {value:number; tag:string} | null => {
    for (const tag of tags) {
      const ns = facts.filter(n=>n.name===tag && (stock?instant:annual).includes(n.attrs.contextRef) && !Object.entries(n.attrs).some(([k,v])=>local(k)==='nil'&&['true','1'].includes(v)));
      const values = ns.filter(n=>{
        const unit = units.get(n.attrs.unitRef);
        return unit && (tag.includes('PerShare')?unit.join('/')==='INR/shares':tag.includes('SharesOutstanding')?unit.join('/')==='shares':unit.join('/')==='INR');
      }).map(n=>n.text.trim()).filter(s=>/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(s)).map(Number).filter(Number.isFinite);
      if (new Set(values).size>1) throw new Error(`Conflicting NSE facts: ${tag}`);
      if (values.length) return {value:values[0],tag};
    }
    return null;
  };
  const put = (field:string,value:number,tags:string[],derived=false) => {
    if (!Number.isFinite(value)) return;
    Object.assign(y,{[field]:spent.has(field)?Math.abs(value):value});
    y.provenance![field]={source:filing.xbrl!,field:tags.join(' + '),method:derived?'derived':'reported',...(derived?{inputs:tags}:{})};
  };
  for (const [stock,mapping] of [[false,durationTags],[true,instantTags]] as const) {
    for (const [field,tags] of Object.entries(mapping)) { const fact=pick(tags,stock); if(fact)put(field,fact.value,[fact.tag]); }
  }
  const minorityProfit=pick(['ProfitOrLossAttributableToNonControllingInterests']);
  if(y.netIncome!==null&&y.totalNetIncome!=null&&minorityProfit&&Math.abs(y.netIncome+minorityProfit.value-y.totalNetIncome)>Math.max(Math.abs(y.totalNetIncome),Math.abs(y.netIncome),1)*0.01){
    y.sourceWarnings=[`NSE profit attribution does not reconcile: parent=${y.netIncome}, NCI=${minorityProfit.value}, total=${y.totalNetIncome}; profit fields quarantined`];
    y.netIncome=null;y.totalNetIncome=null;y.dilutedShares=null;
  }
  const sum = (field:string,tags:string[],stock:boolean) => {
    const parts=tags.map(t=>pick([t],stock));
    if(parts.every(p=>p!==null))put(field,parts.reduce((s,p)=>s+p!.value,0),tags,true);
  };
  sum('receivables',['TradeReceivablesCurrent','TradeReceivablesNoncurrent'],true);
  sum('payables',['TradePayablesCurrent','TradePayablesNoncurrent'],true);
  if(y.totalDebt===null)sum('totalDebt',['BorrowingsCurrent','BorrowingsNoncurrent'],true);
  if(y.equity===null)sum('equity',['Capital','ReservesAndSurplus'],true);
  if(y.cashAndCashEquivalents==null)sum('cashAndCashEquivalents',['CashAndBalancesWithReserveBankOfIndia','BalancesWithBanksAndMoneyAtCallAndShortNotice'],true);
  if(y.cashAndCashEquivalents!=null){
    const bank=pick(['BankBalanceOtherThanCashAndCashEquivalents'],true);
    put('cashAndDeposits',y.cashAndCashEquivalents+(bank?.value??0),['cashAndCashEquivalents',...(bank?[bank.tag]:[])],true);
    put('cash',y.cashAndCashEquivalents+(bank?.value??0)+(y.shortTermInvestments??0),['cashAndCashEquivalents',...(bank?[bank.tag]:[]),...(y.shortTermInvestments!=null?['shortTermInvestments']:[])],true);
  }
  const tangible=pick(['PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities','PurchaseOfTangibleAssetsClassifiedAsInvestingActivities']);
  const intangible=pick(['PurchaseOfIntangibleAssetsClassifiedAsInvestingActivities']);
  if(tangible&&intangible){
    const development=pick(['PurchaseOfIntangibleAssetsUnderDevelopment']);
    put('capex',Math.abs(tangible.value)+Math.abs(intangible.value)+Math.abs(development?.value??0),[tangible.tag,intangible.tag,...(development?[development.tag]:[])],true);
  }
  if(y.operatingIncome===null && y.revenue!==null){
    const expenses=pick(['Expenses']),interest=pick(['FinanceCosts']);
    if(expenses&&interest)put('operatingIncome',y.revenue-expenses.value+interest.value,['RevenueFromOperations','Expenses','FinanceCosts'],true);
  }
  if(y.interestIncome!=null && y.totalIncome!=null && y.interestExpense!==null){
    put('revenue',y.totalIncome,['Income']);
    put('netRevenue',y.totalIncome-y.interestExpense,['Income','InterestExpended'],true);
  }
  if(y.equity!==null&&y.goodwill!==null&&y.intangibles!==null)put('tangibleEquity',y.equity-y.goodwill-y.intangibles,['equity','goodwill','intangibles'],true);
  if(y.netIncome!==null && y.dilutedEps && y.netIncome/y.dilutedEps>0 && y.dilutedShares===null)put('dilutedShares',y.netIncome/y.dilutedEps,['netIncome','dilutedEps'],true);
  // Coverage describes the source, but missing concepts remain unknown. Do not invoke
  // deriveYears' absent-in-complete-statement zero defaults for NSE result templates.
  y.statementCoverage={income:false,balance:false,cashFlow:false};
  if(y.revenue===null&&y.netIncome===null)throw new Error('No recognized annual income facts');
  return [y];
}

/** Legacy NSE HTML is a labelled results table, not a full annual report. */
export function parseIndiaLegacy(html:string, filing:IndiaFiling):Year {
  const nodes=descendants(document(html,false));
  const rows=nodes.filter(n=>n.name==='tr').map(n=>n.children.filter(c=>c.name==='td'||c.name==='th').map(content));
  const cells=rows.flat(), text=cells.join(' ');
  if(!cells.some(s=>sameIssuer(filing.symbol,s))||!cells.includes('Consolidated')||!text.includes(filing.toDate)||filing.consolidated!=='Consolidated')throw new Error('Legacy identity/annual/consolidated mismatch');
  const scale=/Amount\s*\(Rs\.\s*in\s*lakhs\)/i.test(text)?100000:null;
  if(!scale)throw new Error('Unknown legacy NSE units');
  const y=emptyYear(indiaDate(filing.toDate),'INR');y.provenance={};
  const mapping:Record<string,RegExp[]>={
    revenue:[/^Total income from operations \(net\)/i,/^\(a\) Net sales\/income from operations/i,/^Net Sales\/Income from Operations?$/i,/^Total Income$/i],
    operatingIncome:[/^Profit\s*\/\s*\(Loss\) from operations before other income, finance costs and exceptional items$/i,/^Profit from Operations before Other Income, Interest & Exceptional Items$/i,/^Operating Profit before provisions and contingencies$/i],
    netIncome:[/^Net Profit\s*\/\s*\(Loss\) after taxes, minority interest and share of profit\s*\/\s*\(loss\) of associates$/i,/^Consolidated Net Profit \(\+\) \/ Loss \(-\) for the period$/i,/^Consolidated Net Profit\/Loss for the period$/i],
    totalNetIncome:[/^Net Profit\s*\/\s*\(Loss\) for the period$/i],
    preTaxIncome:[/^Profit\s*\/\s*\(Loss\) from ordinary activities before tax$/i],
    da:[/^(?:\(e\)\s*)?Depreciation and amortisation expense$/i,/^Depreciation$/i],
    taxExpense:[/^Tax expense$/i],interestExpense:[/^Finance costs$/i,/^Interest$/i,/^Interest Expended$/i],nonRecurring:[/^Exceptional items$/i],
    interestIncome:[/^Interest Earned$/i],nonInterestExpense:[/^Operating Expenses$/i],creditLossProvision:[/^Provisions \(other than tax\) and contingencies$/i],
  };
  for(const [field,patterns]of Object.entries(mapping))for(const pattern of patterns){
    const pair=rows.find(row=>row.length>=2&&pattern.test(row[0]));if(!pair)continue;
    const raw=pair[1].replaceAll(',','').trim();if(!/^-?\d+(\.\d+)?([Ee][+-]?\d+)?$/.test(raw))continue;
    Object.assign(y,{[field]:Number(raw)*scale});y.provenance[field]={source:filing.resultDetailedDataLink!,field:pair[0]+' (INR lakhs × 100000)',method:'reported'};break;
  }
  y.statementCoverage={income:false,balance:false,cashFlow:false};
  if(y.revenue===null||y.netIncome===null)throw new Error('Unsupported legacy income format');
  return y;
}

/** Field labels and lakh units follow NSE's own Format10/11/13 display renderers. */
export function parseIndiaDetail(raw:Record<string,unknown>,filing:IndiaFiling):Year{
  if(String(raw.seqnum)!==filing.seqNumber||raw.periodEndDT!==filing.toDate||raw.finresultDate!==`${filing.fromDate} To ${filing.toDate}`||filing.consolidated!=='Consolidated'||filing.audited!=='Audited'||filing.period!=='Annual'||raw.conNonCon!=null&&raw.conNonCon!=='Consolidated'||raw.perType!=null&&raw.perType!=='Annual'||raw.resType!=null&&raw.resType!=='Audited')throw new Error('NSE detail identity/annual mismatch');
  if(!['format3','format4','format5'].includes(String(raw.resultFormat)))throw new Error('Unsupported NSE detail format');
  const data=(raw.resultsData2??raw.resultsData) as Record<string,unknown>|null;
  if(!data)throw new Error('NSE detail has no results');
  const y=emptyYear(indiaDate(filing.toDate),'INR');y.provenance={};
  const mapping:Record<string,string[]>={
    revenue:['re_net_sale','re_tot_inc'],totalIncome:['re_total_inc','re_tot_inc'],
    // Pre-2018 rows were migrated into format4; its newer attribution columns are
    // null. Their old Format11 consolidated-net-profit column is already after NCI.
    netIncome:raw.resultFormat==='format5'||raw.resultFormat==='format4'&&Number(filing.toDate.slice(-4))>2017?['re_pl_own_par']:['re_pl_own_par','re_con_pro_loss'],
    totalNetIncome:['re_net_profit'],preTaxIncome:['re_pro_loss_bef_tax'],taxExpense:['re_tax'],
    da:['re_depr_und_exp'],interestExpense:['re_int_new','re_int_expd','re_int'],
    interestIncome:['re_int_earned'],nonInterestExpense:['re_oper_exp'],creditLossProvision:['re_oth_pro_cont'],
    operatingIncome:['re_oper_exp_bef_pro_cont','re_opr_pro_bfr_int'],nonRecurring:['re_excepn_items_new','re_excepn_items'],
  };
  const number=(key:string)=>typeof data[key]==='string'&&/^-?\d+(\.\d+)?$/.test(data[key] as string)?Number(data[key])*100000:null;
  for(const [field,tags]of Object.entries(mapping))for(const tag of tags){const n=number(tag);if(n===null)continue;Object.assign(y,{[field]:n});y.provenance[field]={source:detailUrl(filing),field:`${tag} (INR lakhs × 100000)`,method:'reported'};break;}
  const expense=number('re_oth_tot_exp');
  const minority=number('re_tot_pl_nci'),total=number('re_con_pro_loss');
  if(raw.resultFormat==='format4'&&Number(filing.toDate.slice(-4))>2017&&y.netIncome!==null&&minority!==null&&total!==null&&Math.abs(y.netIncome+minority-total)>Math.max(Math.abs(y.netIncome),Math.abs(total),1)*0.01){
    y.sourceWarnings=[`NSE detail profit attribution does not reconcile: parent=${y.netIncome}, NCI=${minority}, total=${total}; profit fields quarantined`];y.netIncome=null;y.totalNetIncome=null;
  }
  if(y.operatingIncome===null&&y.revenue!==null&&expense!==null&&y.interestExpense!==null){y.operatingIncome=y.revenue-expense+y.interestExpense;y.provenance.operatingIncome={source:detailUrl(filing),field:'operatingIncome',method:'derived',inputs:['re_net_sale','re_oth_tot_exp','re_int_new']};}
  y.statementCoverage={income:false,balance:false,cashFlow:false};
  if(y.revenue===null)throw new Error('Unsupported NSE detail income fields');
  if(y.netIncome===null&&!y.sourceWarnings?.length)y.sourceWarnings=['NSE detail does not report parent-attributable profit; left unknown'];
  return y;
}

/** Corroborate currency and parent income/revenue before supplementing latest years. */
export function mergeIndiaYahoo(official:Year[],yahoo:Year[]):{years:Year[];notes:string[]} {
  const overlaps=official.flatMap(a=>yahoo.filter(b=>b.end===a.end).map(b=>[a,b] as const));
  if(!overlaps.length)return {years:official,notes:['Yahoo not merged: no overlapping annual period']};
  const agree=(a:number,b:number)=>Math.abs(a-b)<=Math.max(Math.abs(a),Math.abs(b),1)*0.03;
  for(const [a,b]of overlaps){
    if(a.currency!=='INR'||b.currency!=='INR'||a.netIncome===null||b.netIncome===null||!agree(a.netIncome,b.netIncome)||a.revenue===null||b.revenue===null||!agree(a.revenue,b.revenue))
      return {years:official,notes:[`Yahoo not merged: conflicting annual totals/currency in ${a.fy}`]};
  }
  const byEnd=new Map<string,Year>(official.map(y=>[y.end,{...y,provenance:{...y.provenance}}]));
  const latest=official.at(-1)!.end;
  for(const y of yahoo){
    if(y.currency!=='INR')continue;
    const old=byEnd.get(y.end);
    if(!old){if(y.end>latest)byEnd.set(y.end,y);continue;}
    for(const [key,value]of Object.entries(y)){
      if(typeof value!=='number'||key==='fy'||(old as unknown as Record<string,unknown>)[key]!=null)continue;
      // Share/EPS bases can differ after splits or across ADR listings: retain official basis.
      if(/Shares|Eps|sharesOutstanding|marketCap/.test(key))continue;
      Object.assign(old,{[key]:value});
      if(y.provenance?.[key])old.provenance![key]=y.provenance[key];
    }
  }
  return {years:[...byEnd.values()].sort((a,b)=>a.end.localeCompare(b.end)),notes:['Yahoo latest years merged after annual INR revenue and parent-profit corroboration']};
}
