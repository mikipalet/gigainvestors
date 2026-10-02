'use client';
import {BusinessSection, JudgementLine} from './BusinessSection';
import {humanVerdict} from '@/lib/value/judgement/apply';
import {ThesisDisclosure} from './ThesisDisclosure';
import { useEffect, useState, type ReactNode } from 'react';
import { TileNumbers, FinancialHighlights, FilingSignals } from './DossierNumbers';
import { T } from '@/lib/value/config';
import { QUALITY_TESTS, type Dossier, type PriceMap, type TestKey, type TestOutcome } from '@/lib/value/types';
import { comparableValuation } from '@/lib/value/site-valuation';
import { dateLabel, priceValue, priceState, companyName } from '@/lib/value/presentation';
import { formatMetric } from '@/lib/value/metric-labels';
import { testLabels } from './TestChips';
import dynamic from 'next/dynamic';
const loadEvidence=()=>import('./EvidencePanel');
const EvidencePanel=dynamic(()=>loadEvidence().then(m=>m.EvidencePanel));
const ValuationPanel=dynamic(()=>loadEvidence().then(m=>m.ValuationPanel));
import { ValueLink } from './ValueLink';
import { SidePanel } from './SidePanel';

import { StatusGlyph } from './viz/StatusGlyph';
import { MiniSeries } from './viz/MiniSeries';
import { MiniDollar, MiniPrice } from './viz/TileCharts';
import { primaryTileMetric, tileSentence } from '@/lib/value/tile-metric';
import { priceFraming } from '@/lib/value/presentation';
import { CompanyLogo } from './CompanyLogo';
import { ownerReturn, cashCoveredReturnCopy, expectedReturnCopy, requiredReturnCopy, returnModelCopy } from '@/lib/value/owner-return';
import { bestWesternListing, westernTradingLabel } from '@/lib/value/western';
import { sharePrice } from '@/lib/value/listing-details';

export function DossierContent({ dossier, quote = null, children }: { dossier: Dossier; quote?: PriceMap[string] | null; children?: ReactNode }) {
 const [panel,setPanel]=useState<TestKey|'valuation'|null>(null);
 const [thesisOpen,setThesisOpen]=useState(false);
 const [panels,setPanels]=useState<typeof import('./EvidencePanel')|null>(null);
 const Evidence=panels?.EvidencePanel??EvidencePanel, Valuation=panels?.ValuationPanel??ValuationPanel;
 const {company,valuation,report}=dossier;
 useEffect(()=>{const timer=setTimeout(()=>void loadEvidence().then(setPanels),800);return()=>clearTimeout(timer);},[]);
 const comparable=comparableValuation(valuation,company.currency);
 const canShowPrice=Boolean(comparable&&quote);
 const requiredMos=dossier.requiredMos??T.price.requiredMos.stable;
 const state=priceState({price:quote?.[0]??null,mid:comparable?.perShare.mid??null,b:dossier.b});
 const ratio=priceValue({price:quote?.[0]??null,mid:comparable?.perShare.mid??null});
 const price:TestOutcome={key:'price',result:state.state==='pass'?'pass':state.state==='fail'?'fail':'unclear',numeric:'unclear',metrics:{},series:{},reasons:[],jev:[]};
 const tests=[...QUALITY_TESTS.map(key=>dossier.tests[key as keyof typeof dossier.tests]!),price];
 const years=Object.values(dossier.tests).flatMap(t=>Object.values(t.series).flat().map(p=>p[0]));
 const lastFiscalYear=years.length?Math.max(...years):undefined;
 const reportUrl=report.url?.startsWith('https://')?report.url:null;
 const insufficient=dossier.status==='insufficient_data';
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{
  if((e.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]')||e.ctrlKey||e.metaKey||e.altKey||document.querySelector('[role="combobox"]'))return;
  if(!insufficient&&/^[1-6]$/.test(e.key)&&(e.key!=='6'||canShowPrice)){e.preventDefault();setPanel([...QUALITY_TESTS,'price'][Number(e.key)-1] as TestKey);}
 };window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[insufficient,canShowPrice]);
 const pct=(n:number|null|undefined)=>formatMetric({value:n??null,format:'pct'});
 const m=(key:Exclude<TestKey,'price'>,metric:string)=>dossier.tests[key].metrics[metric]??null;
 const deciding=Object.fromEntries(tests.map(test=>{const metric=primaryTileMetric(test,company.kind,dossier.tests.understandable.series.netIncome??dossier.series.netIncome);if(test.key==='price'){metric.value=ratio;metric.threshold=1-requiredMos;}return [test.key,metric];})) as Record<TestKey,ReturnType<typeof primaryTileMetric>>;
 const glyph=(test:TestOutcome)=>test.key==='price'?state.state:test.result;
 const name=companyName(company);
 const w=dossier.w===undefined?bestWesternListing(company):dossier.w;
 const tradingLabel=westernTradingLabel(w,company.id,company.exchange);
 const qualityPass=QUALITY_TESTS.every(key=>dossier.tests[key as keyof typeof dossier.tests]?.result==='pass');
 const framing=priceFraming(ratio,requiredMos);
 const owner=ownerReturn(valuation,company.currency,company.marketCapUsd,quote?.[0]??null);
 const coveredCopy=cashCoveredReturnCopy(valuation,company.currency,quote?.[0]??null);
 const ownerCopy=owner?expectedReturnCopy(owner,valuation,company.country):coveredCopy|| (valuation?.method==='book_value'?`This financial business uses a book-value estimate; ${requiredReturnCopy(valuation,company.country)}.`:'');
 const referenceRow=comparable?<section className="reference-metrics" aria-label="Key numbers">
  {quote&&<span>Share price <b>{sharePrice(quote[0],company.currency)}</b></span>}

  <span>Buy below <b>{sharePrice(comparable?comparable.perShare.mid*(1-requiredMos):null,company.currency)}</b></span>
  <span title={ownerCopy}>{coveredCopy?<>Excess cash covers price · no finite IRR</>:<>About <b>{owner?pct(owner.expected):'—'}</b> a year at today's price (needs {pct(valuation!.discountRate)})</>}</span>
 </section>:<section className="reference-metrics" aria-label="Key numbers">
  {quote&&<span>Share price <b>{sharePrice(quote[0],company.currency)}</b></span>}
  <span>Quality tests <b>{QUALITY_TESTS.filter(key=>dossier.tests[key]?.result==='pass').length} / 5 pass</b></span>
  <span>Annual history <b>{dossier.historyCoverage?.years??'—'} years</b></span>
  {company.marketCapUsd!=null&&<span>Market value <b>{formatMetric({value:company.marketCapUsd,format:'money',currency:'USD'})}</b></span>}
 </section>;
 const failed=QUALITY_TESTS.filter(key=>dossier.tests[key]?.result==='fail');

 const shortHistory=dossier.historyCoverage && dossier.historyCoverage.years<T.minYears;
 const verdict=shortHistory?'Not enough history yet':humanVerdict(dossier,Boolean(dossier.b),canShowPrice,ratio);
 const identity=<div className="one-identity"><ValueLink href="/" className="back-link">← Companies</ValueLink><div className="company-heading"><CompanyLogo src={company.logo} name={name}/><div><h1>{name}</h1><p title={tradingLabel??'Not easily buyable from Western brokers'}>{company.code} · {company.exchange}</p>{Boolean(company.indexes?.length)&&<p className="company-indexes">{company.indexes!.join(" · ")}</p>}</div></div>{children}</div>;

 if(insufficient){
  const count=dossier.historyCoverage?.years??new Set(years).size;
  return <div className="one-dossier insufficient-dossier locks-scroll"><section className="dossier-band insufficient-band">{identity}<div data-testid="insufficient-data"><h2>Not enough history yet</h2><p>{count} annual periods on record. Seven are required for the quality checklist.</p></div></section><BusinessSection analysis={dossier} price={quote?.[0]??null}/><FinancialHighlights dossier={dossier}/>{reportUrl&&<div className="dossier-source"><a href={reportUrl}>Original filing ↗</a></div>}</div>;
 }

 return <div onPointerOver={()=>{if(!panels)void loadEvidence().then(setPanels);}} onFocus={()=>{if(!panels)void loadEvidence().then(setPanels);}} className="one-dossier locks-scroll" data-quality={qualityPass?'pass':failed.length?'fail':'unclear'}>
  <section className="dossier-band">{identity}
   <div className="one-verdict" data-testid="verdict"><p className="plain-verdict" data-verdict={dossier.thesis?.changed?'Thesis disclosure':verdict}>{verdict}</p>{<p className="verdict-explanation">{dossier.thesis?.changed?dossier.thesis.reason:qualityPass?'Passes all 5 quality tests.':failed.length?`${failed.length} quality ${failed.length===1?'test fails':'tests fail'}. A lower price would not fix the business.`:shortHistory?`Only ${dossier.historyCoverage!.years} years of filings; the checklist needs 7.`:''}</p>}
    {dossier.thesis?.liabilities?.filter(l=>l.marketValueRatio>.1).sort((a,b)=>b.marketValueRatio-a.marketValueRatio).slice(0,1).map((l,i)=><p key={i} className="thesis-guidance">{(l.marketValueRatio*100).toFixed(1)}% of market value{l.ownerEarningsRatio!==null?`; ${l.ownerEarningsRatio.toFixed(1)} years of owner earnings`:''}{l.basis==='claimed'?'. Claimed damages; not an established loss.':''}</p>)}
    {dossier.thesis?.guidance&&<p className="thesis-guidance">Owner earnings: {dossier.thesis.guidance.before.toLocaleString('en-US',{maximumFractionDigits:0})} → {dossier.thesis.guidance.after.toLocaleString('en-US',{maximumFractionDigits:0})} {valuation?.currency}, reflecting current-year guidance.</p>}
    {dossier.thesis&&<button className="thesis-source-button" onClick={()=>setThesisOpen(true)}>Read the disclosure ↗</button>}
   </div>
   {referenceRow}
  </section>
  <BusinessSection analysis={dossier} price={quote?.[0]??null}/>
  <div className="dossier-checks">
   <section className="quality-section" aria-label="Five business quality tests"><h2>1. Is this a good business? </h2>
    <div className="test-tiles">{tests.filter(test=>test.key!=='price').map((test,i)=>{const d=deciding[test.key];return <article key={test.key} className={`test-tile ${glyph(test)}`} data-testid={`tile-${test.key}`} data-metric={d.id}><button className="tile-open" aria-label={`Open ${testLabels[test.key]} evidence`} onClick={()=>setPanel(test.key)}><header><span><small>{i+1}</small> {testLabels[test.key]}</span><span><StatusGlyph result={glyph(test)} label={`${testLabels[test.key]}: ${glyph(test)}`}/>{test.result}</span></header></button><p className="tile-sentence">{tileSentence(test,d,company.kind)}</p>{test.key==='management'&&m('management','retainedEarnings')!==null&&m('management','marketCapGain')!==null?<MiniDollar currency={dossier.reportingCurrency??valuation?.currency??company.currency} fluid retained={m('management','retainedEarnings')} created={m('management','marketCapGain')} first={m('management','retainedStartFy')} last={m('management','retainedEndFy')}/>:d.series.filter(p=>p[1]!==null).length===0?<FilingSignals test={test}/>:<MiniSeries currency={dossier.reportingCurrency??valuation?.currency??company.currency} fluid height={135} series={d.series} label={d.chart} format={d.chartFormat==='index'?'count':d.chartFormat==='ratio'?'x':d.chartFormat??(test.key==='understandable'?'pct':d.format)} threshold={d.chartThreshold===null?undefined:d.chartThreshold??(test.key==='understandable'?undefined:d.threshold)} better={d.chartBetter??d.better}/>}<TileNumbers metric={d} test={test} currency={dossier.reportingCurrency??valuation?.currency??company.currency}/>{test.judgement?.override&&<div className="tile-assessment"><JudgementLine test={test} adjustments={dossier.judgement?.adjustments} currency={dossier.reportingCurrency??company.currency} onExplain={()=>setPanel(test.key)}/></div>}</article>;})}</div>
   </section>
   {comparable&&quote&&<section className="price-section" aria-label="Separate price check"><h2>2. Is the price low enough?</h2><article className={`test-tile price-card ${glyph(price)}`} data-testid="tile-price" data-metric="priceToMid" title={[framing.headline,valuation&&!comparable?`Price is in ${company.currency}, value in ${valuation.currency}, not compared`:'',quote?.[2]==='seed'?`Price estimated from market value on ${dateLabel(quote[1])}`:''].filter(Boolean).join(' · ')}><button className="tile-open" aria-label="Open valuation" onClick={()=>setPanel('valuation')}><header><span>Price · separate check</span><span><StatusGlyph result={glyph(price)} label={`Price: ${glyph(price)}`}/>{state.label}</span></header></button>
    {comparable&&<MiniPrice dossier={dossier} quote={quote} fluid height={240} minimumHeight={50}/>}
    <table className="valuation-math"><caption>Price &amp; return math</caption><tbody>
     <tr><th>Value range</th><td>{sharePrice(comparable.perShare.low,company.currency)} – {sharePrice(comparable.perShare.high,company.currency)}</td></tr>
     <tr><th>Buy price</th><td>{sharePrice(comparable.perShare.mid,company.currency)} × (1 − {pct(requiredMos)}) = {sharePrice(comparable.perShare.mid*(1-requiredMos),company.currency)}</td></tr>
     <tr><th>Discount to value</th><td>1 − {quote[0].toFixed(2)} / {comparable.perShare.mid.toFixed(2)} = {pct(1-quote[0]/comparable.perShare.mid)}</td></tr>
     {(owner||coveredCopy)&&<tr><th>Return / year</th><td title={ownerCopy}>{ownerCopy}</td></tr>}
     {valuation&&<tr><th>Cash-flow inputs</th><td>{returnModelCopy(valuation,company.currency)}</td></tr>}
     {valuation&&<tr><th>Required return</th><td>{pct(valuation.discountRate)} / year</td></tr>}
    </tbody></table>
   </article></section>}
  </div>
  <FinancialHighlights dossier={dossier}/>
  <div className="dossier-source"><span className="source-date" title={quote?.[2]==='seed'?`Price estimated from market value on ${dateLabel(quote[1])}`:undefined}>{quote?`Prices ${dateLabel(quote[1])}`:''}{lastFiscalYear?` · FY${lastFiscalYear}`:''}</span><span className="source-links">{reportUrl&&<a href={reportUrl}>Original filing ↗ · </a>}</span></div>
  {thesisOpen&&dossier.thesis&&<SidePanel title={dossier.thesis.changed?'Liability disclosure':'Current-year guidance'} onClose={()=>setThesisOpen(false)}><ThesisDisclosure thesis={dossier.thesis}/></SidePanel>}
  {panel&&<SidePanel title={panel==='valuation'?'Valuation':testLabels[panel]} onClose={()=>setPanel(null)}>{panel==='valuation'||panel==='price'?<Valuation dossier={dossier} quote={quote}/>:<Evidence key={panel} dossier={dossier} test={dossier.tests[panel]}/>}</SidePanel>}
 </div>;
}
