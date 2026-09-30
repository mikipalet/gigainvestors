'use client';
import { useEffect, useState, type ReactNode } from 'react';
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
import { tileMetric, tileReason, tileSentence } from '@/lib/value/tile-metric';
import { priceFraming } from '@/lib/value/presentation';
import { CompanyLogo } from './CompanyLogo';
import { ownerReturn, expectedReturnCopy, requiredReturnCopy, referenceMetrics } from '@/lib/value/owner-return';
import { bestWesternListing, westernTradingLabel } from '@/lib/value/western';
import { sharePrice } from '@/lib/value/listing-details';

export function DossierContent({ dossier, quote = null, children }: { dossier: Dossier; quote?: PriceMap[string] | null; children?: ReactNode }) {
 const [panel,setPanel]=useState<TestKey|'valuation'|null>(null);
 const [panels,setPanels]=useState<typeof import('./EvidencePanel')|null>(null);
 const Evidence=panels?.EvidencePanel??EvidencePanel, Valuation=panels?.ValuationPanel??ValuationPanel;
 const {company,valuation,report}=dossier;
 useEffect(()=>{const timer=setTimeout(()=>void loadEvidence().then(setPanels),800);return()=>clearTimeout(timer);},[]);
 const comparable=comparableValuation(valuation,company.currency);
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
  if(/^[1-6]$/.test(e.key)){e.preventDefault();setPanel([...QUALITY_TESTS,'price'][Number(e.key)-1] as TestKey);}
 };window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[insufficient]);
 const pct=(n:number|null|undefined)=>formatMetric({value:n??null,format:'pct'});
 const m=(key:Exclude<TestKey,'price'>,metric:string)=>dossier.tests[key].metrics[metric]??null;
 const deciding=Object.fromEntries(tests.map(test=>{const metric=tileMetric(test,company.kind,dossier.tests.understandable.series.netIncome??dossier.series.netIncome);if(test.key==='price'){metric.value=ratio;metric.threshold=1-requiredMos;}return [test.key,metric];})) as Record<TestKey,ReturnType<typeof tileMetric>>;
 const glyph=(test:TestOutcome)=>test.key==='price'?state.state:test.result;
 const name=companyName(company);
 const w=dossier.w===undefined?bestWesternListing(company):dossier.w;
 const tradingLabel=westernTradingLabel(w,company.id,company.exchange);
 const qualityPass=QUALITY_TESTS.every(key=>dossier.tests[key as keyof typeof dossier.tests]?.result==='pass');
 const framing=priceFraming(ratio,requiredMos);
 const owner=ownerReturn(valuation,company.currency,company.marketCapUsd,quote?.[0]??null);
 const reference=referenceMetrics(dossier,quote?.[0]??null);
 const ownerCopy=owner?expectedReturnCopy(owner,valuation,company.country):valuation?.method==='book_value'?`This financial business uses a book-value estimate; ${requiredReturnCopy(valuation,company.country)}.`:'Expected return unavailable.';
 const referenceRow=<section className="reference-metrics" aria-label="For reference"><span title={`Market capitalisation / FY${reference.fy??' latest'} net income`}>P/E <b>{reference.pe===null?'n/a':reference.pe.toFixed(1)}</b></span><span title={`FY${reference.fy??' latest'} dividends (profit minus retained earnings) / market capitalisation`}>Dividend yield <b>{reference.dividendYield===null?'n/a':pct(reference.dividendYield)}</b></span><span title="Valuation net debt / latest fiscal-year net income; negative means net cash">Net debt / earnings <b>{reference.netDebtToEarnings===null?'n/a':reference.netDebtToEarnings.toFixed(1)+' years'}</b></span><span title={`${reference.first??'Unknown'}–${reference.last??'unknown'} revenue CAGR; ten fiscal observations span nine years`}>10-year revenue growth <b>{reference.revenueGrowth===null?'n/a':pct(reference.revenueGrowth)+'/yr'}</b></span></section>;
 const failed=QUALITY_TESTS.filter(key=>dossier.tests[key]?.result==='fail');

 const shortHistory=dossier.historyCoverage && dossier.historyCoverage.years<10;
 const returnBelow=qualityPass && owner && valuation && owner.expected<valuation.discountRate && ratio!==null && ratio<=1-requiredMos;
 const verdict=failed.length?'Fails quality':shortHistory?'Not enough history yet':!qualityPass?'Quality evidence incomplete':!valuation?'Valuation unavailable':dossier.b?'Buy zone':returnBelow?'Wait for a higher return':'Wait for a better price';
 const identity=<div className="one-identity"><ValueLink href="/" className="back-link">← Companies</ValueLink><div className="company-heading"><CompanyLogo src={company.logo} name={name}/><div><h1>{name}</h1><p title={tradingLabel??'Not easily buyable from Western brokers'}>{company.code} · {company.exchange}</p>{Boolean(company.indexes?.length)&&<p className="company-indexes">{company.indexes!.join(" · ")}</p>}</div></div>{company.about?.trim()&&<p className="company-about">{company.about}</p>}{children}</div>;

 if(insufficient){
  const coverage=dossier.historyCoverage,count=coverage?.years??new Set(years).size;
  const explanation=count<10?`Only ${count} years of filings; the checklist needs 10.`:'Source figures must reconcile before the checklist can run.';
  return <div className="one-dossier insufficient-dossier locks-scroll"><section className="dossier-band insufficient-band">{identity}<div data-testid="insufficient-data"><h2>{count<10?'Not enough history yet':'Not enough reliable history'}</h2><p>{explanation}</p></div><button className="value-band" data-testid="valuation-open" onClick={()=>setPanel('valuation')}>Valuation unavailable · source data ↗</button></section><div className="test-tiles">{tests.map(t=><button key={t.key} data-testid={`tile-${t.key}`} className="test-tile unclear" onClick={()=>setPanel(t.key)}><header><span>{testLabels[t.key]}</span></header><p className="tile-sentence">{count<10?`Not tested: only ${count} years`:'Not tested'}</p><span className="tile-evidence">Source data ↗</span></button>)}</div><div className="dossier-source">Latest filing {report.period??'arriving'} · {count||'No'} years on file</div>{panel&&<SidePanel title={panel==='valuation'?'Valuation · source data':`${testLabels[panel]} · source data`} onClose={()=>setPanel(null)}><h2>Not tested yet</h2><p>{explanation}</p><p>{dossier.valuationReason??'Statements and quote history are being collected.'}</p>{reportUrl&&<a href={reportUrl}>Original filing ↗</a>}</SidePanel>}</div>;
 }
 return <div onPointerOver={()=>{if(!panels)void loadEvidence().then(setPanels);}} onFocus={()=>{if(!panels)void loadEvidence().then(setPanels);}} className="one-dossier locks-scroll" data-quality={qualityPass?'pass':failed.length?'fail':'unclear'}>
  <section className="dossier-band">{identity}
   <div className="one-verdict" data-testid="verdict"><p className="plain-verdict" data-verdict={verdict}>{verdict}</p>{<p className="verdict-explanation">{qualityPass?returnBelow?`Close to the buy price, but the expected return is under the ${(valuation!.discountRate*100).toLocaleString('en-US',{maximumFractionDigits:1})}% hurdle.`:'Passes all 5 quality tests.':failed.length?`${failed.length} quality ${failed.length===1?'test fails':'tests fail'}. A lower price would not fix the business.`:shortHistory?`Only ${dossier.historyCoverage!.years} years of filings; the checklist needs 10.`:'Quality evidence is incomplete. A cheap price alone is not enough.'}</p>}</div>

  </section>
  {referenceRow}
  <div className="dossier-checks">
   <section className="quality-section" aria-label="Five business quality tests"><h2>1. Is this a good business? </h2>
    <div className="test-tiles">{tests.filter(test=>test.key!=='price').map((test,i)=>{const d=deciding[test.key];return <button key={test.key} className={`test-tile ${glyph(test)}`} data-testid={`tile-${test.key}`} data-metric={d.id} onClick={e=>{e.currentTarget.focus();setPanel(test.key);}}><header><span><small>{i+1}</small> {testLabels[test.key]}</span><span><StatusGlyph result={glyph(test)} label={`${testLabels[test.key]}: ${glyph(test)}`}/>{test.result}</span></header><p className="tile-sentence">{test.insufficientHistory!==undefined?`Not tested: only ${test.insufficientHistory} years`:test.result==='fail'?tileReason(test):tileSentence(test,d,company.kind)}</p>{test.key==='management'?<MiniDollar retained={m('management','retainedEarnings')} created={m('management','marketCapGain')} first={m('management','retainedStartFy')} last={m('management','retainedEndFy')}/>:<MiniSeries series={d.series} label={d.chart} format={test.key==='understandable'?'pct':d.format} threshold={test.key==='understandable'?undefined:d.threshold} better={d.better}/>}</button>;})}</div>
   </section>
   <section className="price-section" aria-label="Separate price check"><h2>2. Is the price low enough?</h2><button className={`test-tile price-card ${glyph(price)}`} data-testid="tile-price" data-metric="priceToMid" title={[framing.headline,valuation&&!comparable?`Price is in ${company.currency}, value in ${valuation.currency}, not compared`:'',quote?.[2]==='seed'?`Price estimated from market value on ${dateLabel(quote[1])}`:''].filter(Boolean).join(' · ')} onClick={()=>setPanel('valuation')}><header><span>Price · separate check</span><span><StatusGlyph result={glyph(price)} label={`Price: ${glyph(price)}`}/>{state.label}</span></header>
    <p className="owner-return" title={ownerCopy}>{owner?`${(owner.expected*100).toFixed(1)}% expected / year`:'Expected return unavailable'}</p>
    <dl className="exact-prices"><div><dt>Share price</dt><dd>{sharePrice(quote?.[0]??null,company.currency)}</dd></div><div><dt>Estimated value</dt><dd>{sharePrice(comparable?.perShare.mid??null,company.currency)}</dd></div><div><dt>Buy price</dt><dd>{sharePrice(comparable?comparable.perShare.mid*(1-requiredMos):null,company.currency)}</dd></div></dl>
    {comparable&&<MiniPrice dossier={dossier} quote={quote}/>}
   </button></section>
  </div>
  <div className="dossier-source"><span className="source-date">{quote?`Prices ${dateLabel(quote[1])}`:'Quote arriving'}{lastFiscalYear?` · FY${lastFiscalYear}`:''}</span><span className="source-links">{reportUrl&&<a href={reportUrl}>Original filing ↗ · </a>}</span></div>
  {panel&&<SidePanel title={panel==='valuation'?'Valuation':`${testLabels[panel]} · evidence`} onClose={()=>setPanel(null)}>{panel==='valuation'||panel==='price'?<Valuation dossier={dossier} quote={quote}/>:<Evidence key={panel} dossier={dossier} test={dossier.tests[panel]}/>}</SidePanel>}
 </div>;
}
