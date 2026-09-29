'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { T } from '@/lib/value/config';
import { QUALITY_TESTS, type Dossier, type TestKey, type TestOutcome, type Series } from '@/lib/value/types';
import { comparableValuation } from '@/lib/value/site-valuation';
import { dateLabel, priceValue, priceState, dossierReturn, displayName, humanLabel, earningsYieldAtMid } from '@/lib/value/presentation';
import { formatMetric } from '@/lib/value/metric-labels';
import { compactMoney } from '@/lib/value/viz/layout';
import { testLabels } from './TestChips';
import { useQuote } from './use-quote';
import { ValueLink } from './ValueLink';
import { SidePanel } from './SidePanel';
import { TestSection } from './TestSection';
import { Bridge } from './Bridge';
import { FootballField } from './viz/FootballField';
import { PriceHistory } from './viz/PriceHistory';
import { StatusGlyph } from './viz/StatusGlyph';
import { CompactValue } from './viz/CompactValue';
import { MiniSeries } from './viz/MiniSeries';
import { MiniDollar, MiniPrice } from './viz/TileCharts';
import { tileMetric, tileReason } from '@/lib/value/tile-metric';
import { DataTable } from './viz/DataTable';

export function DossierContent({ dossier, children }: { dossier: Dossier; children?: ReactNode }) {
 const [panel,setPanel]=useState<TestKey|'valuation'|null>(null);
 const {company,valuation,report}=dossier;
 const quote=useQuote(company.id,company.country);
 const comparable=comparableValuation(valuation,company.currency);
 const requiredMos=dossier.requiredMos??T.price.requiredMos.stable;
 const state=priceState({price:quote?.[0]??null,mid:comparable?.perShare.mid??null,b:dossier.b});
 const ratio=priceValue({price:quote?.[0]??null,mid:comparable?.perShare.mid??null});
 const returnInfo=dossierReturn(dossier);
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
 const estimated=quote?.[2]==='seed'||!!dossier.dataQualityFlags?.length;
 const verification=dossier.dataQualityFlags?.length?'Verify valuation':quote?.[2]==='seed'?'Estimated price':'';
 const glyph=(test:TestOutcome)=>test.key==='price'?state.state:test.pending?'checking':test.result;
 const identity=<div className="one-identity"><ValueLink href="/" className="back-link">← Companies</ValueLink><h1>{displayName(company.name)}</h1><p>{company.code} · {company.exchange} · {company.marketCapUsd===null?'Market cap unavailable':compactMoney(company.marketCapUsd,'USD')}{company.nativeName&&` · ${company.nativeName}`}</p>{children}</div>;
 const valuationEvidence=<>
  {(comparable??valuation)?<FootballField valuation={(comparable??valuation)!} price={quote?.[0]??null} mismatch={valuation&&!comparable?`Price is in ${company.currency}, value in ${valuation.currency}, not compared`:null} requiredMos={requiredMos} date={quote?.[1]} fy={lastFiscalYear} volatility={dossier.volatility}/>:<section><h2>Valuation unavailable</h2><p>{dossier.valuationReason?`${humanLabel(dossier.valuationReason)}.`:'Reliable financial history is required to estimate value.'}</p></section>}
  {dossier.dataQualityFlags?.length?<div className="data-quality-note"><h3>Valuation data needs verification</h3><ul>{dossier.dataQualityFlags.map(f=><li key={f}>{f}</li>)}</ul></div>:null}
  {valuation&&<><Bridge valuation={valuation}/><PriceHistory dossier={dossier} quote={quote} date={quote?.[1]}/><section className="assumptions"><h2>Assumptions & sources</h2><p>Stage one reflects the last 10 years, capped; terminal growth is the long-run economy rate. Estimates are sensitive to these assumptions.</p><DataTable caption="Valuation assumptions" headers={['Assumption','Value']} rows={[
   ['Growth',pct(valuation.growth)],['Required return',pct(valuation.discountRate)],['Terminal growth',pct(valuation.terminalGrowth)],['Government bond yield',pct(valuation.bondYield)],['Earnings yield at mid value',pct(earningsYieldAtMid(valuation))],
  ]}/><ul>{valuation.assumptions.map(a=><li key={a}>{a}</li>)}</ul></section></>}
 </>;
 if(insufficient){
  const coverage=dossier.historyCoverage,count=coverage?.years??new Set(years).size;
  const explanation=count<7?`${count || 'No'} fiscal years on file${coverage?.first?`, from FY${coverage.first}`:''}. At least 7 reliable years are needed to run the checklist; the full review uses 10.`:'Source figures must reconcile before the checklist can run.';
  return <div className="one-dossier locks-scroll"><section className="dossier-band insufficient-band">{identity}<div data-testid="insufficient-data"><h2>Not enough reliable history</h2><p>{explanation}</p></div><button className="value-band" data-testid="valuation-open" onClick={()=>setPanel('valuation')}>Valuation unavailable · source checks ↗</button></section><div className="test-tiles">{tests.map((t,i)=><button key={t.key} data-testid={`tile-${t.key}`} className="test-tile unclear" onClick={()=>setPanel(t.key)}><header><span><small>{i+1}</small>{testLabels[t.key]}</span><StatusGlyph result="unclear" label={`${testLabels[t.key]}: not tested`}/></header><div className="tile-number"><strong className="quiet-number">Not tested</strong><span>Reliable history required</span></div><p>{t.key==='price'?'A valuation needs a completed quality review.':'Evidence is incomplete; no pass or fail assigned.'}</p><span className="tile-evidence">Source checks ↗</span></button>)}</div><div className="dossier-source">Latest filing {report.period??'arriving'} · {count||'No'} years on file</div>{panel&&<SidePanel title={panel==='valuation'?'Valuation · source checks':`${testLabels[panel]} · source checks`} onClose={()=>setPanel(null)}><h2>Not tested yet</h2><p>{explanation}</p><p>{dossier.valuationReason??'Statements and quote history are being collected.'}</p>{reportUrl&&<a href={reportUrl}>Original filing ↗</a>}</SidePanel>}</div>;
 }
 return <div className="one-dossier locks-scroll">
  <section className="dossier-band">{identity}<div className="one-verdict" data-testid="verdict"><p className="verdict-counts">{tests.filter(t=>glyph(t)==='pass').length} pass · {tests.filter(t=>glyph(t)==='fail').length} fail · {tests.filter(t=>!['pass','fail'].includes(glyph(t))).length} unclear</p><div>{tests.map(t=><button key={t.key} onClick={()=>setPanel(t.key)} title={testLabels[t.key]}><StatusGlyph result={glyph(t)} label={`${testLabels[t.key]}: ${glyph(t)}`}/><span>{testLabels[t.key]}</span></button>)}</div></div><button className="value-band" data-testid="valuation-open" onClick={()=>setPanel('valuation')}><div><strong>{ratio===null?'—':`${ratio.toFixed(2)}×${estimated?' est.':''}`}</strong><span>price / mid value</span><b>Valuation ↗</b></div><CompactValue value={comparable} price={quote?.[0]??null} requiredMos={requiredMos}/>{verification&&<small className="verification-flag" title={dossier.dataQualityFlags?.join('; ')??'Price derived from market cap / shares'}>{verification} · est.</small>}{valuation&&!comparable&&<small>Price is in {company.currency}, value in {valuation.currency}, not compared</small>}</button></section>
  <div className="test-tiles">{tests.map((test,i)=>{const d=deciding[test.key],missing=d.value===null;const value=missing?(test.pending?'Checking':'Not reported'):formatMetric({value:d.value,format:d.format});const bar=`${d.better==='higher'?'≥':'≤'} ${formatMetric({value:d.threshold,format:d.format})}`;return <button key={test.key} className={`test-tile ${glyph(test)}`} data-testid={`tile-${test.key}`} data-metric={d.id} onClick={()=>setPanel(test.key)}><header><span><small>{i+1}</small> {testLabels[test.key]}</span><span><StatusGlyph result={glyph(test)} label={`${testLabels[test.key]}: ${glyph(test)}`}/>{test.key==='price'?state.label:test.pending?'Checking':test.result}</span></header><div className="tile-number"><strong className={missing?'quiet-number':value.length>9?'long-number':''}>{value}</strong><span>{d.label}</span><small>Pass {bar}{company.kind!=='operating'&&['moat','accounting'].includes(test.key)?' · financials':''}</small></div>{test.key==='management'?<MiniDollar retained={m('management','retainedEarnings')} created={m('management','marketCapGain')}/>:test.key==='price'?<MiniPrice dossier={dossier} quote={quote}/>:<MiniSeries series={d.series} label={d.chart} format={d.format} threshold={d.threshold}/>}<p title={test.reasons.join('; ')}>{test.key==='price'?ratio===null?'Comparable valuation unavailable.':!dossier.b?'Published snapshot does not qualify at a buy price.':'At or below its buy line.':tileReason(test)}{test.key==='management'&&m('management','shareCagr')!==null&&<small>Shares {pct(m('management','shareCagr'))}/yr</small>}</p><span className="tile-evidence">Evidence ↗</span></button>;})}</div>
  <div className="dossier-source">{quote?`Price ${dateLabel(quote[1])}${quote[2]==='seed'?' · derived from market cap / shares':''}`:'Quote arriving'}{lastFiscalYear?` · Financials FY${lastFiscalYear}`:''}<span>{reportUrl&&<a href={reportUrl}>Original filing ↗ · </a>}Keys 1–6 · <ValueLink href="/method">Method & sources</ValueLink></span></div>
  {panel&&<SidePanel title={panel==='valuation'?'Valuation':`${testLabels[panel]} · evidence`} onClose={()=>setPanel(null)}>{panel==='valuation'||panel==='price'?valuationEvidence:<TestSection test={dossier.tests[panel]} kind={company.kind} events={dossier.events} perShare={dossier.series} lastFiscalYear={lastFiscalYear} requiredMos={requiredMos} priceDate={quote?.[1]} netIncome={dossier.tests.understandable.series.netIncome??dossier.series.netIncome} currency={valuation?.currency??company.currency} reportUrl={reportUrl} valuation={valuation}/>}<p className="source-line">Analysed {dateLabel(dossier.asOf)} · {reportUrl&&<a href={reportUrl}>Original filing ↗ · </a>}<ValueLink href="/method">Method & sources →</ValueLink></p></SidePanel>}
 </div>;
}
