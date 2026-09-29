import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { annualReportDocuments } from "../../../lib/value/japan/edinet";
import { parseEdinetCsv, yearsFromEdinet, sectionsFromEdinet, mergeYears } from "../../../lib/value/japan/xbrl-csv";
import { mergeJapaneseCompanies } from "../../../lib/value/japan/companies";
import type { Company } from "../../../lib/value/types";
import { writeCorpusJson, readCorpusJson } from "../../../lib/value/corpus";
import reports from "../../../scripts/value/stages/reports";
const fixture = path.resolve("tests/fixtures/value/edinet");
const rows = () => readdirSync(path.join(fixture, "mitsubishi-csv")).flatMap(file => parseEdinetCsv(readFileSync(path.join(fixture, "mitsubishi-csv", file), "utf16le")));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("selects available annual filings, including Mitsubishi's actual June 18 filing", () => {
  const data = JSON.parse(readFileSync(path.join(fixture, "documents-2025-06-18.json"), "utf8"));
  expect(annualReportDocuments(data).find(d => d.secCode === "80580")?.docID).toBe("S100VYM1");
  expect(annualReportDocuments({results:[{...data.results[0], docTypeCode:"120", secCode:"80580", withdrawalStatus:"1"}]})).toEqual([]);
});
it("parses quoted tabs, newlines, escaped quotes and missing units", () => {
  expect(parseEdinetCsv('要素ID\tコンテキストID\t単位\t値\n"x"\t"ctx"\t""\t"a\tb\n""c"""')).toEqual([{element:"x",context:"ctx",unit:null,value:'a\tb\n"c"'}]);
});
it("normalizes real IFRS summary and statements in absolute JPY, without parent/segment contamination", () => {
  const years = yearsFromEdinet(rows());
  expect(years.map(y => y.fy)).toEqual([2021,2022,2023,2024,2025]);
  expect(years.every(y => y.currency === "JPY" && y.revenue !== null && y.netIncome !== null)).toBe(true);
  expect(years.at(-1)).toMatchObject({end:"2025-03-31",revenue:18617601000000,netIncome:950709000000,ocf:1658349000000,capex:384292000000,da:470768000000,equity:9368714000000,totalAssets:21496104000000,totalLiabilities:11341782000000,minorityInterest:785608000000});
  expect(years[0].capex).toBeNull();
});
it("later reports restate overlapping facts without erasing earlier full statements", () => {
  const years = yearsFromEdinet(rows());
  expect(mergeYears([years.at(-1)!], [{...years.at(-1)!,revenue:42,capex:null}])[0]).toMatchObject({revenue:42,capex:384292000000});
});
it("extracts bounded Japanese business, risk and capital text", () => {
  const sections=sectionsFromEdinet(rows());
  expect(sections.business).toMatch(/[\u3040-\u9fff]/);
  expect(sections.risk?.length).toBeGreaterThan(100);
  expect(sections.capital?.length).toBeGreaterThan(100);
  expect(sections.business!.length).toBeLessThanOrEqual(32000);
});
const company = (id:string,name:string):Company => ({id,code:id.split('.')[0],name,exchange:id.split('.')[1],country:'JP',currency:'USD',isin:null,cik:null,lei:null,edinetCode:null,sector:null,industry:null,kind:'operating',listings:[id],marketCapUsd:null,description:null,source:'eodhd'});
it("merges Toyota and OTC trading-house ADRs into home listings without confusing Mitsubishi issuers", () => {
  const home={...company('8058.JP','三菱商事株式会社'),currency:'JPY',source:'edinet' as const};
  const result=mergeJapaneseCompanies({existing:[company('MSBHF.US','Mitsubishi Corporation'),company('MUFG.US','Mitsubishi UFJ Financial Group')],incoming:[{company:home,englishName:'Mitsubishi Corporation'}]});
  expect(result.companies.map(c=>c.id).sort()).toEqual(['8058.JP','MUFG.US']);
  expect(result.companies.find(c=>c.id==='8058.JP')?.listings).toEqual(['8058.JP','MSBHF.US']);
  expect(result.merged).toEqual([{from:'MSBHF.US',to:'8058.JP'}]);
  expect(mergeJapaneseCompanies({existing:[company('TM.US','Toyota Motor Corporation')],incoming:[{company:company('7203.JP','トヨタ自動車株式会社'),englishName:'TOYOTA MOTOR CORPORATION'}]}).companies).toHaveLength(1);
});
it("reports preserves EDINET prose even when forced, with no SEC or ESEF requests", async () => {
  const dir=mkdtempSync(path.join(os.tmpdir(),'japan-test-'));vi.stubEnv('VALUE_CORPUS_DIR',dir);
  vi.stubGlobal('fetch',()=>{throw new Error('network forbidden')});
  try {
    writeFileSync(path.join(dir,'universe.jsonl'),JSON.stringify({...company('8058.JP','三菱商事'),source:'edinet'})+'\n');
    mkdirSync(path.join(dir,'reports/8058.JP'),{recursive:true});writeFileSync(path.join(dir,'reports/8058.JP/business.txt'),'三菱商事');
    const meta={id:'8058.JP',kind:'EDINET',sections:['business'],filed:'2025-06-18',period:'2025-03-31',url:null};writeCorpusJson('reports/8058.JP/meta.json',meta);
    await reports({force:true}); expect(readCorpusJson('reports/8058.JP/meta.json')).toEqual(meta);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
it("keeps parent-only facts out of consolidated years and supports standalone Japanese GAAP", () => {
  const r=(element:string,context:string,value:string)=>({element:`jppfs_cor:${element}`,context,unit:'円',value});
  const data=[r('CurrentFiscalYearEndDateDEI','FilingDateInstant','2025-03-31'),r('WhetherConsolidatedFinancialStatementsArePreparedDEI','FilingDateInstant','true'),r('NetSalesSummaryOfBusinessResults','CurrentYearDuration','1000'),r('NetSalesSummaryOfBusinessResults','CurrentYearDuration_NonConsolidatedMember','100'),r('NetSalesSummaryOfBusinessResults','CurrentYearDuration_SegmentMember','50'),r('NetAssetsSummaryOfBusinessResults','CurrentYearInstant','600'),r('NonControllingInterests','CurrentYearInstant','20')];
  expect(yearsFromEdinet(data)[0]).toMatchObject({revenue:1000,equity:580,capex:null});
  data[1].value='false';
  const parent=data.filter(row=>!['CurrentYearDuration','CurrentYearInstant'].includes(row.context));
  expect(yearsFromEdinet(parent)[0].revenue).toBe(100);
});
it("does not turn net treasury-share issuance into buyback spending", () => {
  const data=rows();
  const row=data.find(r=>r.element.endsWith(':NetDecreaseIncreaseInTreasurySharesFinCFIFRS')&&r.context==='CurrentYearDuration')!;
  row.value='500';
  expect(yearsFromEdinet(data).at(-1)!.buybacks).toBe(0);
});
it("never merges a genuinely ambiguous English issuer name",()=>{
  const result=mergeJapaneseCompanies({existing:[company('EX.US','Example ADR')],incoming:[{company:company('1234.JP','例'),englishName:'Example Corporation'},{company:company('5678.JP','例二'),englishName:'Example Limited'}]});
  expect(result.companies).toHaveLength(3);expect(result.merged).toEqual([]);
});
it('keeps an exact home identity unique when two issuers share the same English name',()=>{
 const home=company('1234.JP','Example');
 const result=mergeJapaneseCompanies({existing:[home],incoming:[{company:home,englishName:'Example'},{company:company('5678.JP','例'),englishName:'Example'}]});
 expect(result.companies.map(c=>c.id)).toEqual(['1234.JP','5678.JP']);
});
it('uses valid fiscal month ends across leap years',()=>{
 const data=rows();
 data.find(r=>r.element.endsWith(':CurrentFiscalYearEndDateDEI'))!.value='2025-02-28';
 data.find(r=>r.element.endsWith(':PreviousFiscalYearEndDateDEI'))!.value='2024-02-29';
 expect(yearsFromEdinet(data).slice(-2).map(y=>y.end)).toEqual(['2024-02-29','2025-02-28']);
});
it('rejects the EDINET 00000 placeholder used by unrelated unlisted issuers',()=>{
 const data=JSON.parse(readFileSync(path.join(fixture,'documents-2025-06-18.json'),'utf8'));
 const doc=annualReportDocuments(data)[0];
 expect(annualReportDocuments({results:[{...doc,secCode:'00000'}]})).toEqual([]);
});
it('does not merge ordinary US namesakes or a Japanese home absent from the current checkpoint',()=>{
 const geo={...company('GEO.US','Geo Group Inc'),country:'US',isin:'US36162J1060'};
 const hub={...company('HUBG.US','Hub Group Inc'),country:'US',isin:'US4433201062'};
 const ice={...company('2268.JP','Ｂ－Ｒ　サーティワン　アイスクリーム株式会社'),source:'edinet' as const};
 const result=mergeJapaneseCompanies({existing:[geo,hub,ice],incoming:[{company:company('2681.JP','株式会社ゲオホールディングス'),englishName:'GEO HOLDINGS CORPORATION'},{company:company('3030.JP','株式会社ハブ'),englishName:'HUB CO., LTD.'},{company:company('1726.JP','株式会社ビーアールホールディングス'),englishName:'Br. Holdings Corporation'}]});
 expect(result.merged).toEqual([]);expect(result.companies).toHaveLength(6);
});
it('merges unlabelled Japanese ADRs with headquarters evidence and OTC receipt codes',()=>{
 const smfg={...company('SMFG.US','Sumitomo Mitsui Financial Group Inc'),country:'US',description:'The company is headquartered in Tokyo, Japan.'};
 const mitsui={...company('MITSY.US','Mitsui & Co. Ltd'),country:'US'};
 const result=mergeJapaneseCompanies({existing:[smfg,mitsui],incoming:[{company:company('8316.JP','三井住友'),englishName:'Sumitomo Mitsui Financial Group, Inc.'},{company:company('8031.JP','三井物産'),englishName:'MITSUI & CO., LTD.'}]});
 expect(result.merged).toEqual([{from:'SMFG.US',to:'8316.JP'},{from:'MITSY.US',to:'8031.JP'}]);
});
it('does not interpret the letters ads inside an ordinary company name as an ADR label',()=>{
 const old={...company('ROAD.US','Roads Corporation'),country:'US'};
 expect(mergeJapaneseCompanies({existing:[old],incoming:[{company:company('1234.JP','道路'),englishName:'Roads Corporation'}]}).merged).toEqual([]);
});
it('does not relabel ordinary profit as profit before tax when extraordinary items are unknown',()=>{
 const data=[{element:'jpdei_cor:CurrentFiscalYearEndDateDEI',context:'FilingDateInstant',unit:null,value:'2025-03-31'},{element:'jpcrp_cor:NetSalesSummaryOfBusinessResults',context:'Prior2YearDuration',unit:'円',value:'1000'},{element:'jpcrp_cor:OrdinaryIncomeLossSummaryOfBusinessResults',context:'Prior2YearDuration',unit:'円',value:'100'}];
 expect(yearsFromEdinet(data)[0].preTaxIncome).toBeNull();
});
it('normalizes recorded Japanese GAAP depreciation and combined capital expenditure',()=>{
 const data=parseEdinetCsv(readFileSync(path.join(fixture,'kyokuyo-2026.csv'),'utf16le'));
 expect(yearsFromEdinet(data).at(-1)).toMatchObject({currency:'JPY',da:3034000000,capex:3234000000});
});
it('imports the US GAAP summary used by Fujifilm without inventing full-statement facts',()=>{
 const data=JSON.parse(readFileSync(path.join(fixture,'fujifilm-summary.json'),'utf8'));
 const years=yearsFromEdinet(data);
 expect(years.map(y=>y.fy)).toEqual([2022,2023,2024,2025,2026]);
 expect(years.at(-1)).toMatchObject({revenue:3356969000000,netIncome:276735000000,preTaxIncome:366629000000,equity:3839550000000,totalAssets:6053776000000,ocf:410555000000,cash:170553000000,da:null,capex:null});
});
it('distinguishes listed holding companies from Japanese subsidiaries and namesakes',()=>{
 const nomura={...company('NMR.US','Nomura Holdings Inc ADR'),country:'US'};
 const softbank={...company('SFTBY.US','SoftBank Group Corp'),country:'US'};
 const result=mergeJapaneseCompanies({existing:[nomura,softbank],incoming:[{company:company('7131.JP','のむら産業'),englishName:'NOMURA CO.,LTD.'},{company:company('8604.JP','野村ホールディングス'),englishName:'Nomura Holdings, Inc.'},{company:company('9434.JP','ソフトバンク'),englishName:'SoftBank Corp.'},{company:company('9984.JP','ソフトバンクグループ'),englishName:'SoftBank Group Corp.'}]});
 expect(result.merged).toEqual([{from:'NMR.US',to:'8604.JP'},{from:'SFTBY.US',to:'9984.JP'}]);
});
it('keeps distinct Japanese issuers when global name normalization drops their Japanese words',async()=>{
 const {collapseListings}=await import('../../../lib/value/universe');
 const rows=[company('2127.JP','株式会社日本Ｍ＆Ａセンターホールディングス'),company('6080.JP','Ｍ＆Ａキャピタルパートナーズ株式会社')];
 expect(collapseListings(rows).map(g=>g.primary)).toEqual(['2127.JP','6080.JP']);
});
it('anchors older fiscal years to the reported previous year end when the year end changes',()=>{
 const r=(element:string,value:string,context='FilingDateInstant')=>({element:'jpdei_cor:'+element,context,unit:null,value});
 const data=[r('CurrentFiscalYearEndDateDEI','2025-09-30'),r('PreviousFiscalYearEndDateDEI','2025-03-31'),r('NetSalesSummaryOfBusinessResults','1000','CurrentYearDuration'),r('NetSalesSummaryOfBusinessResults','900','Prior1YearDuration'),r('NetSalesSummaryOfBusinessResults','800','Prior2YearDuration')];
 expect(yearsFromEdinet(data).map(y=>[y.fy,y.end,y.revenue])).toEqual([[2024,'2024-03-31',800],[2025,'2025-09-30',1000]]);
});
it('does not carry cash-flow facts between different fiscal periods ending in the same year',()=>{
 const earlier=yearsFromEdinet(rows()).at(-1)!;
 const later={...earlier,end:'2025-09-30',capex:null};
 expect(mergeYears([earlier],[later])[0].capex).toBeNull();
});
it('does not discard Japanese homes as foreign listings of unrelated overseas acronym matches',async()=>{
 const {collapseListings}=await import('../../../lib/value/universe');
 const overseas={...company('STI.US','STI Holdings Inc'),country:'US',isin:'US0000000001'};
 const home=company('2932.JP','ＳＴＩフードホールディングス株式会社');
 expect(collapseListings([overseas,home]).map(g=>g.primary)).toEqual(['STI.US','2932.JP']);
});
