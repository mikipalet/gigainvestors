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
import { MetricHelp } from './MetricHelp';
import { priceFraming } from '@/lib/value/presentation';
import { CompanyLogo } from './CompanyLogo';
import { AboutMethod } from './AboutMethod';
import { ownerReturn, expectedReturnCopy, requiredReturnCopy, referenceMetrics, cashAmount } from '@/lib/value/owner-return';
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
 const verification=dossier.dataQualityFlags?.length?'Verify valuation':quote?.[2]==='seed'?'Estimated price':'';
 const glyph=(test:TestOutcome)=>test.key==='price'?state.state:test.pending?'checking':test.result;
 const name=companyName(company);
 const qualityPass=QUALITY_TESTS.every(key=>dossier.tests[key as keyof typeof dossier.tests]?.result==='pass');
 const framing=priceFraming(ratio,requiredMos);
 const owner=ownerReturn(valuation,company.currency,company.marketCapUsd,quote?.[0]??null);
 const reference=referenceMetrics(dossier,quote?.[0]??null);
 const ownerCopy=owner?expectedReturnCopy(owner,valuation,company.country):valuation?.method==='book_value'?`This financial business uses a book-value estimate; ${requiredReturnCopy(valuation,company.country)}.`:'Expected return unavailable.';
 const referenceRow=<section className="reference-metrics" aria-label="For reference"><strong>For reference</strong><span title={`Market capitalisation / FY${reference.fy??' latest'} net income`}>P/E <b>{reference.pe===null?'n/a':reference.pe.toFixed(1)}</b></span><span title={`FY${reference.fy??' latest'} dividends (profit minus retained earnings) / market capitalisation`}>Dividend yield <b>{reference.dividendYield===null?'n/a':pct(reference.dividendYield)}</b></span><span title="Valuation net debt / latest fiscal-year net income; negative means net cash">Net debt / earnings <b>{reference.netDebtToEarnings===null?'n/a':reference.netDebtToEarnings.toFixed(1)+' years'}</b></span><span title={`${reference.first??'Unknown'}–${reference.last??'unknown'} revenue CAGR; ten fiscal observations span nine years`}>10-year revenue growth <b>{reference.revenueGrowth===null?'n/a':pct(reference.revenueGrowth)+'/yr'}</b></span></section>;
 const failed=QUALITY_TESTS.filter(key=>dossier.tests[key]?.result==='fail');
 const verdict=!qualityPass?'Fails quality':dossier.b?'Buy zone':'Wait for a better price';
 const identity=<div className="one-identity"><ValueLink href="/" className="back-link">← Companies</ValueLink><div className="company-heading"><CompanyLogo src={company.logo} name={name}/><div><h1>{name}</h1><p>{company.code} · {company.exchange}</p></div></div><p className="company-about">{company.about??(company.sector?`A business in ${company.sector.toLowerCase()}.`:'A company description has not been published yet.')}</p>{children}</div>;

 const valuationEvidence=<><p className="owner-return">{ownerCopy}</p>{owner&&<p className="owner-growth">Cash yield: {cashAmount(owner.cash,owner.currency)} normalized yearly owner cash ÷ {cashAmount(owner.capital,owner.currency)} capitalisation. Growth: the valuation’s capped assumption. Yield plus growth is an estimate, not the discounted cash-flow model’s exact annual return.</p>}
  {(comparable??valuation)?<FootballField valuation={(comparable??valuation)!} price={quote?.[0]??null} mismatch={valuation&&!comparable?`Price is in ${company.currency}, value in ${valuation.currency}, not compared`:null} requiredMos={requiredMos} date={quote?.[1]} fy={lastFiscalYear} volatility={dossier.volatility}/>:<section><h2>Valuation unavailable</h2><p>{dossier.valuationReason?`${humanLabel(dossier.valuationReason)}.`:'Reliable financial history is required to estimate value.'}</p></section>}
  {dossier.dataQualityFlags?.length?<div className="data-quality-note"><h3>Valuation data needs verification</h3><ul>{dossier.dataQualityFlags.map(f=><li key={f}>{f}</li>)}</ul></div>:null}
  {valuation&&<><Bridge valuation={valuation}/><PriceHistory dossier={dossier} quote={quote} date={quote?.[1]}/><section className="assumptions"><h2>Assumptions & sources</h2><p>Stage one reflects the last 10 years, capped; terminal growth is the long-run economy rate. Estimates are sensitive to these assumptions.</p><DataTable caption="Valuation assumptions" headers={['Assumption','Value']} rows={[
   ['Growth',pct(valuation.growth)],['Required return',pct(valuation.discountRate)],['Terminal growth',pct(valuation.terminalGrowth)],['Government bond yield',pct(valuation.bondYield)],['Earnings yield at mid value',pct(earningsYieldAtMid(valuation))],
  ]}/><ul>{valuation.assumptions.map(a=><li key={a}>{a}</li>)}</ul></section></>}
 </>;
 if(insufficient){
  const coverage=dossier.historyCoverage,count=coverage?.years??new Set(years).size;
  const explanation=count<7?`${count || 'No'} fiscal years on file${coverage?.first?`, from FY${coverage.first}`:''}. At least 7 reliable years are needed to run the checklist; the full review uses 10.`:'Source figures must reconcile before the checklist can run.';
  return <div className="one-dossier locks-scroll"><section className="dossier-band insufficient-band">{identity}<div data-testid="insufficient-data"><h2>Not enough reliable history</h2><p>{explanation}</p></div><button className="value-band" data-testid="valuation-open" onClick={()=>setPanel('valuation')}>Valuation unavailable · source checks ↗</button></section><div className="test-tiles">{tests.map((t,i)=><button key={t.key} data-testid={`tile-${t.key}`} className="test-tile unclear" onClick={()=>setPanel(t.key)}><header><span><small>{i+1}</small>{testLabels[t.key]}</span><StatusGlyph result="unclear" label={`${testLabels[t.key]}: not tested`}/></header><p className="tile-sentence">Reliable financial history is needed before this test can run.</p><div className="tile-number"><strong className="quiet-number">Not tested</strong><span>Reliable history required</span></div><p>{t.key==='price'?'A valuation needs a completed quality review.':'Evidence is incomplete; no pass or fail assigned.'}</p><span className="tile-evidence">Source checks ↗</span></button>)}</div><div className="dossier-source">Latest filing {report.period??'arriving'} · {count||'No'} years on file</div>{panel&&<SidePanel title={panel==='valuation'?'Valuation · source checks':`${testLabels[panel]} · source checks`} onClose={()=>setPanel(null)}><h2>Not tested yet</h2><p>{explanation}</p><p>{dossier.valuationReason??'Statements and quote history are being collected.'}</p>{reportUrl&&<a href={reportUrl}>Original filing ↗</a>}</SidePanel>}</div>;
 }
 return <div className="one-dossier locks-scroll" data-quality={qualityPass?'pass':'fail'}>
  <section className="dossier-band">{identity}
   <div className="one-verdict" data-testid="verdict"><p className="checklist-label">5 quality tests + price</p><p className="plain-verdict" data-verdict={verdict}>{verdict}</p><p className="verdict-explanation">{qualityPass?'Passes all 5 quality tests.':failed.length?`${failed.length} quality tests fail. A lower price would not fix the business.`:'Quality evidence is incomplete. A cheap price alone is not enough.'}</p></div>
   <button className="value-band" data-testid="valuation-open" onClick={()=>setPanel('valuation')}><p className="value-definition"><strong>Estimated value</strong> = {company.kind==='operating'?'future cash for owners, in today’s money, per share.':'an asset-based estimate per share for banks and insurers.'} <span>Buy price: 25% below for steadier businesses; up to 50% below for less predictable ones.</span></p>{valuation&&!comparable&&<span>Price is in {company.currency}, value in {valuation.currency}, not compared</span>}<span className="band-price-summary">{framing.headline} · How we calculate it ↗</span></button>
  </section>
  {referenceRow}
  <div className="dossier-checks">
   <section className="quality-section" aria-label="Five business quality tests"><h2>1. Is this a good business? <span>Five quality tests</span></h2>
    <div className="test-tiles">{tests.filter(test=>test.key!=='price').map((test,i)=>{const d=deciding[test.key],missing=d.value===null;const value=missing?(test.pending?'Checking':'Not reported'):d.format==='x'?(d.id==='opMarginCv'?`${Math.round(d.value!*100)}%`:`$${d.value!.toFixed(2)}`):formatMetric({value:d.value,format:d.format});const bar=`${d.better==='higher'?'≥':'≤'} ${formatMetric({value:d.threshold,format:d.format})}`;return <button key={test.key} className={`test-tile ${glyph(test)}`} data-testid={`tile-${test.key}`} data-metric={d.id} onClick={e=>{e.currentTarget.focus();setPanel(test.key);}}><header><span><small>{i+1}</small> {testLabels[test.key]}</span><span><StatusGlyph result={glyph(test)} label={`${testLabels[test.key]}: ${glyph(test)}`}/>{test.pending?'Checking':test.result}</span></header><p className="tile-sentence">{test.result==='fail'?tileReason(test):tileSentence(test,d,company.kind)}</p><div className="tile-number"><strong className={missing?'quiet-number':value.length>9?'long-number':''}>{value}</strong><span className="metric-direction">{d.better==='lower'?'↓ Lower is better':'↑ Higher is better'}</span></div><MetricHelp id={d.id} technical={d.label}/><span className="buffett-bar">Pass at {bar} {test.key!=='management'&&<span className="chart-side-note">· shaded side passes</span>}</span>{test.key==='management'?<MiniDollar retained={m('management','retainedEarnings')} created={m('management','marketCapGain')} first={m('management','retainedStartFy')} last={m('management','retainedEndFy')}/>:<MiniSeries series={d.series} label={d.chart} format={d.format} threshold={d.threshold} better={d.better}/>}<p className="tile-reason" title={test.reasons.join('; ')}>{tileReason(test)}</p><span className="tile-evidence">Why this result? ↗</span></button>;})}</div>
   </section>
   <section className="price-section" aria-label="Separate price check"><h2>2. Is the price low enough?</h2><button className={`test-tile price-card ${glyph(price)}`} data-testid="tile-price" data-metric="priceToMid" onClick={()=>setPanel('valuation')}><header><span>Price · separate check</span><span><StatusGlyph result={glyph(price)} label={`Price: ${glyph(price)}`}/>{state.label}</span></header>
    {!qualityPass&&<p className="price-quality-warning">{failed.length?'Quality fails':'Quality not confirmed'} — price alone cannot qualify this company.</p>}
    <p className="owner-return">{ownerCopy}</p><p className="tile-sentence price-multiple">{framing.headline}</p>
    <dl className="exact-prices"><div><dt>Share price</dt><dd>{sharePrice(quote?.[0]??null,company.currency)}</dd></div><div><dt>Estimated value</dt><dd>{sharePrice(comparable?.perShare.mid??null,company.currency)}</dd></div><div><dt>Buy price</dt><dd>{sharePrice(comparable?comparable.perShare.mid*(1-requiredMos):null,company.currency)}</dd></div></dl>
    <p className="price-condition">{framing.fall}{framing.drop!==null&&framing.drop>0&&<small>A condition for buying, not a forecast.</small>}</p><p className="price-discount">This business needs a {Math.round(requiredMos*100)}% discount to estimated value.</p>
    {verification&&<p className="verification-flag">{quote?.[2]==='seed'?`Price estimated from market value on ${dateLabel(quote[1])}`:verification}</p>}
    {comparable&&<MiniPrice dossier={dossier} quote={quote}/>}<span className="tile-evidence">Valuation, assumptions & full chart ↗</span>
   </button></section>
  </div>
  <div className="dossier-source"><span className="source-date">{quote?`Prices ${dateLabel(quote[1])}`:'Quote arriving'}{lastFiscalYear?` · FY${lastFiscalYear}`:''}</span><span className="source-links">{reportUrl&&<a href={reportUrl}>Original filing ↗ · </a>}<span className="source-keys">Keys 1–6 · </span><AboutMethod author={dossier.author}/></span></div>
  {panel&&<SidePanel title={panel==='valuation'?'Valuation':`${testLabels[panel]} · evidence`} onClose={()=>setPanel(null)}>{panel==='valuation'||panel==='price'?valuationEvidence:<TestSection test={dossier.tests[panel]} kind={company.kind} events={dossier.events} perShare={dossier.series} lastFiscalYear={lastFiscalYear} requiredMos={requiredMos} priceDate={quote?.[1]} netIncome={dossier.tests.understandable.series.netIncome??dossier.series.netIncome} currency={valuation?.currency??company.currency} reportUrl={reportUrl} valuation={valuation}/>}<p className="source-line">Analysed {dateLabel(dossier.asOf)} · {reportUrl&&<a href={reportUrl}>Original filing ↗ · </a>}<ValueLink href="/method">Method & sources →</ValueLink></p></SidePanel>}
 </div>;
}
