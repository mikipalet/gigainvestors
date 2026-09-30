'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { T } from '@/lib/value/config';
import { QUALITY_TESTS, type Dossier, type TestKey, type TestOutcome } from '@/lib/value/types';
import { comparableValuation } from '@/lib/value/site-valuation';
import { dateLabel, priceValue, priceState, companyName, humanLabel, earningsYieldAtMid } from '@/lib/value/presentation';
import { formatMetric } from '@/lib/value/metric-labels';
import { testLabels } from './TestChips';
import { useQuote } from './use-quote';
import { ValueLink } from './ValueLink';
import { SidePanel } from './SidePanel';
import { TestSection } from './TestSection';
import { Bridge } from './Bridge';
import { FootballField } from './viz/FootballField';
import { PriceHistory } from './viz/PriceHistory';
import { StatusGlyph } from './viz/StatusGlyph';
import { MiniSeries } from './viz/MiniSeries';
import { MiniDollar, MiniPrice } from './viz/TileCharts';
import { tileMetric, tileReason, tileSentence } from '@/lib/value/tile-metric';
import { DataTable } from './viz/DataTable';
import { priceFraming } from '@/lib/value/presentation';
import { CompanyLogo } from './CompanyLogo';
import { AboutMethod } from './AboutMethod';
import { ownerReturn, expectedReturnCopy, requiredReturnCopy, referenceMetrics, cashAmount } from '@/lib/value/owner-return';
import { bestWesternListing, westernTradingLabel } from '@/lib/value/western';
import { sharePrice } from '@/lib/value/listing-details';

export function DossierContent({ dossier, children }: { dossier: Dossier; children?: ReactNode }) {
 const [panel,setPanel]=useState<TestKey|'valuation'|null>(null);
 const {company,valuation,report}=dossier;
 const quote=useQuote(company.id,company.country);
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
 const glyph=(test:TestOutcome)=>test.key==='price'?state.state:test.pending?'checking':test.result;
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
 const needsVerification=Boolean(dossier.dataQualityFlags?.length);
 const shortHistory=dossier.historyCoverage && dossier.historyCoverage.years<10;
 const returnBelow=qualityPass && owner && valuation && owner.expected<valuation.discountRate && ratio!==null && ratio<=1-requiredMos;
 const verdict=failed.length?'Fails quality':shortHistory?'Not enough history yet':!qualityPass?'Quality evidence incomplete':needsVerification?'Outside buy zone':dossier.b?'Buy zone':returnBelow?'Wait for a higher return':'Wait for a better price';
 const identity=<div className="one-identity"><ValueLink href="/" className="back-link">← Companies</ValueLink><div className="company-heading"><CompanyLogo src={company.logo} name={name}/><div><h1>{name}</h1><p title={tradingLabel??'Not easily buyable from Western brokers'}>{company.code} · {company.exchange}</p></div></div>{company.about?.trim()&&<p className="company-about">{company.about}</p>}{children}</div>;

 const valuationEvidence=<><p>{tradingLabel??'Not easily buyable from Western brokers'}</p><p className="value-definition">Estimated value is {company.kind==='operating'?'future cash for owners in today’s money, per share':'an asset-based estimate per share for banks and insurers'}. Buy price is 25–50% below that estimate, depending on stability.</p>{quote?.[2]==='seed'&&<p>Price estimated from market value on {dateLabel(quote[1])}</p>}<p className="owner-return">{ownerCopy}</p><p>{framing.headline}. {framing.fall} {framing.drop!==null&&framing.drop>0?'A condition for buying, not a forecast.':''}</p>{owner&&<p className="owner-growth">Cash yield: {cashAmount(owner.cash,owner.currency)} normalized yearly owner cash ÷ {cashAmount(owner.capital,owner.currency)} capitalisation. Growth: the valuation’s capped assumption. Yield plus growth is an estimate, not the discounted cash-flow model’s exact annual return.</p>}
  {(comparable??valuation)?<FootballField valuation={(comparable??valuation)!} price={quote?.[0]??null} mismatch={valuation&&!comparable?`Price is in ${company.currency}, value in ${valuation.currency}, not compared`:null} requiredMos={requiredMos} date={quote?.[1]} fy={lastFiscalYear} volatility={dossier.volatility}/>:<section><h2>Valuation unavailable</h2><p>{dossier.valuationReason?`${humanLabel(dossier.valuationReason)}.`:'Reliable financial history is required to estimate value.'}</p></section>}
  {valuation&&<><Bridge valuation={valuation}/><PriceHistory dossier={dossier} quote={quote} date={quote?.[1]}/><section className="assumptions"><h2>Assumptions & sources</h2><p>Stage one reflects the last 10 years, capped; terminal growth is the long-run economy rate. Estimates are sensitive to these assumptions.</p><DataTable caption="Valuation assumptions" headers={['Assumption','Value']} rows={[
   ['Growth',pct(valuation.growth)],['Required return',pct(valuation.discountRate)],['Terminal growth',pct(valuation.terminalGrowth)],['Government bond yield',pct(valuation.bondYield)],['Earnings yield at mid value',pct(earningsYieldAtMid(valuation))],
  ]}/><ul>{valuation.assumptions.filter(a=>!/verif(?:y|ied|ication)/i.test(a)).map(a=><li key={a}>{a}</li>)}</ul></section></>}
 </>;
 if(insufficient){
  const coverage=dossier.historyCoverage,count=coverage?.years??new Set(years).size;
  const explanation=count<10?`Only ${count} years of filings; the checklist needs 10.`:'Source figures must reconcile before the checklist can run.';
  return <div className="one-dossier insufficient-dossier locks-scroll"><section className="dossier-band insufficient-band">{identity}<div data-testid="insufficient-data"><h2>{count<10?'Not enough history yet':'Not enough reliable history'}</h2><p>{explanation}</p></div><button className="value-band" data-testid="valuation-open" onClick={()=>setPanel('valuation')}>Valuation unavailable · source checks ↗</button></section><div className="test-tiles">{tests.map(t=><button key={t.key} data-testid={`tile-${t.key}`} className="test-tile unclear" onClick={()=>setPanel(t.key)}><header><span>{testLabels[t.key]}</span></header><p className="tile-sentence">{count<10?`Not tested: only ${count} years`:'Not tested'}</p><span className="tile-evidence">Source checks ↗</span></button>)}</div><div className="dossier-source">Latest filing {report.period??'arriving'} · {count||'No'} years on file</div>{panel&&<SidePanel title={panel==='valuation'?'Valuation · source checks':`${testLabels[panel]} · source checks`} onClose={()=>setPanel(null)}><h2>Not tested yet</h2><p>{explanation}</p><p>{dossier.valuationReason??'Statements and quote history are being collected.'}</p>{reportUrl&&<a href={reportUrl}>Original filing ↗</a>}</SidePanel>}</div>;
 }
 return <div className="one-dossier locks-scroll" data-quality={qualityPass?'pass':failed.length?'fail':'unclear'}>
  <section className="dossier-band">{identity}
   <div className="one-verdict" data-testid="verdict"><p className="plain-verdict" data-verdict={verdict}>{verdict}</p><p className="verdict-explanation">{qualityPass?needsVerification?'Quality passes; valuation data needs checking.':returnBelow?`Close to the buy price, but the expected return is under the ${(valuation!.discountRate*100).toLocaleString('en-US',{maximumFractionDigits:1})}% hurdle.`:'Passes all 5 quality tests.':failed.length?`${failed.length} quality ${failed.length===1?'test fails':'tests fail'}. A lower price would not fix the business.`:shortHistory?`Only ${dossier.historyCoverage!.years} years of filings; the checklist needs 10.`:'Quality evidence is incomplete. A cheap price alone is not enough.'}</p></div>

  </section>
  {referenceRow}
  <div className="dossier-checks">
   <section className="quality-section" aria-label="Five business quality tests"><h2>1. Is this a good business? <span>Five quality tests</span></h2>
    <div className="test-tiles">{tests.filter(test=>test.key!=='price').map((test,i)=>{const d=deciding[test.key];return <button key={test.key} className={`test-tile ${glyph(test)}`} data-testid={`tile-${test.key}`} data-metric={d.id} onClick={e=>{e.currentTarget.focus();setPanel(test.key);}}><header><span><small>{i+1}</small> {testLabels[test.key]}</span><span><StatusGlyph result={glyph(test)} label={`${testLabels[test.key]}: ${glyph(test)}`}/>{test.pending?'Checking':test.result}</span></header><p className="tile-sentence">{test.insufficientHistory!==undefined?`Not tested: only ${test.insufficientHistory} years`:test.result==='fail'?tileReason(test):tileSentence(test,d,company.kind)}</p>{test.key==='management'?<MiniDollar retained={m('management','retainedEarnings')} created={m('management','marketCapGain')} first={m('management','retainedStartFy')} last={m('management','retainedEndFy')}/>:<MiniSeries series={d.series} label={d.chart} format={test.key==='understandable'?'pct':d.format} threshold={test.key==='understandable'?undefined:d.threshold} better={d.better}/>}<span className="tile-evidence">Evidence ↗</span></button>;})}</div>
   </section>
   <section className="price-section" aria-label="Separate price check"><h2>2. Is the price low enough?</h2><button className={`test-tile price-card ${glyph(price)}`} data-testid="tile-price" data-metric="priceToMid" title={[framing.headline,valuation&&!comparable?`Price is in ${company.currency}, value in ${valuation.currency}, not compared`:'',quote?.[2]==='seed'?`Price estimated from market value on ${dateLabel(quote[1])}`:''].filter(Boolean).join(' · ')} onClick={()=>setPanel('valuation')}><header><span>Price · separate check</span><span><StatusGlyph result={glyph(price)} label={`Price: ${glyph(price)}`}/>{state.label}</span></header>
    <p className="owner-return" title={ownerCopy}>{owner?`${(owner.expected*100).toFixed(1)}% expected / year`:'Expected return unavailable'}</p>
    <dl className="exact-prices"><div><dt>Share price</dt><dd>{sharePrice(quote?.[0]??null,company.currency)}</dd></div><div><dt>Estimated value</dt><dd>{sharePrice(comparable?.perShare.mid??null,company.currency)}</dd></div><div><dt>Buy price</dt><dd>{sharePrice(comparable?comparable.perShare.mid*(1-requiredMos):null,company.currency)}</dd></div></dl>
    {comparable&&<MiniPrice dossier={dossier} quote={quote}/>}<span className="tile-evidence">Valuation & evidence ↗</span>
   </button></section>
  </div>
  <div className="dossier-source"><span className="source-date">{quote?`Prices ${dateLabel(quote[1])}`:'Quote arriving'}{lastFiscalYear?` · FY${lastFiscalYear}`:''}</span><span className="source-links">{reportUrl&&<a href={reportUrl}>Original filing ↗ · </a>}<span className="source-keys">Keys 1–6 · </span><AboutMethod author={dossier.author}/></span></div>
  {panel&&<SidePanel title={panel==='valuation'?'Valuation':`${testLabels[panel]} · evidence`} onClose={()=>setPanel(null)}>{panel==='valuation'||panel==='price'?valuationEvidence:<TestSection test={dossier.tests[panel]} kind={company.kind} events={dossier.events} perShare={dossier.series} lastFiscalYear={lastFiscalYear} requiredMos={requiredMos} priceDate={quote?.[1]} netIncome={dossier.tests.understandable.series.netIncome??dossier.series.netIncome} currency={valuation?.currency??company.currency} reportUrl={reportUrl} valuation={valuation}/>}<p className="source-line">Analysed {dateLabel(dossier.asOf)} · {reportUrl&&<a href={reportUrl}>Original filing ↗ · </a>}<ValueLink href="/method">Method & sources →</ValueLink></p></SidePanel>}
 </div>;
}
