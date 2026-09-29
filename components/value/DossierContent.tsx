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
import { DataTable } from './viz/DataTable';

export function DossierContent({ dossier, children }: { dossier: Dossier; children?: ReactNode }) {
 const [panel,setPanel]=useState<TestKey|'valuation'|null>(null);
 const {company,valuation,report}=dossier;
 const quote=useQuote(company.id,company.country);
 const comparable=comparableValuation(valuation,company.currency);
 const requiredMos=dossier.requiredMos??T.price.requiredMos.stable;
 const state=priceState({price:quote?.[0]??null,mid:comparable?.perShare.mid??null,requiredMos});
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
 const deciding:Record<TestKey,{value:string;label:string;series:Series;chart:string;threshold?:number;reason:string}>={
  understandable:{value:formatMetric({value:m('understandable','historyYears'),format:'count'}),label:'years of financials',series:dossier.tests.understandable.series.operatingMargin??dossier.series.tangibleBookValuePerShare??[],chart:company.kind==='operating'?'Operating margin':'Tangible book / share',reason:'Durable demand and a business we can understand.'},
  moat:{value:returnInfo.label,label:company.kind==='operating'?'return on tangible capital':'return on tangible equity',series:dossier.tests.moat.series[company.kind==='operating'?'roic':'roe']??[],chart:company.kind==='operating'?'ROIC':'Return on equity',threshold:company.kind==='operating'?T.moat.roicMedian:T.moat.roeMedianFin,reason:returnInfo.note??'Returns above the cost of capital over ten years.'},
  economics:{value:company.kind==='operating'?formatMetric({value:m('economics','oeToNi'),format:'x'}):returnInfo.label,label:company.kind==='operating'?'owner earnings / net income':'return on tangible equity',series:dossier.tests.economics.series.ownerEarnings??dossier.series.tangibleBookValuePerShare??[],chart:company.kind==='operating'?'Owner earnings':'Tangible book / share',reason:company.kind==='operating'?'At least 0.80× net income converts to owner earnings.':'Financial businesses use a book-value model.'},
  management:{value:pct(m('management','shareCagr')),label:'annual share-count change',series:dossier.tests.management.series.shares??[],chart:'Diluted shares',reason:'Per-share value creation and disciplined capital allocation.'},
  accounting:{value:company.kind==='operating'?pct(m('accounting','accruals')):formatMetric({value:m('accounting','redFlags'),format:'count'}),label:company.kind==='operating'?'Sloan accruals':'accounting red flags',series:dossier.tests.accounting.series.accruals??[],chart:'Sloan accruals',threshold:T.accounting.maxAccruals,reason:'Reported earnings backed by cash and clean accounts.'},
  price:{value:ratio===null?'Not compared':`${ratio.toFixed(2)}×`,label:'price / mid value',series:(dossier.priceHistory??[]).map(([date,close])=>[Date.parse(date),close]),chart:'Monthly closing price',reason:ratio===null?state.description:`Buy at ${(1-requiredMos).toFixed(2)}× mid value or below.`},
 };
 if(m('understandable','lossYears')!>T.understandable.maxLossYears){deciding.understandable.value=String(m('understandable','lossYears'));deciding.understandable.label='loss years';}
 else if(dossier.tests.understandable.result==='fail'&&m('understandable','opMarginCv')!=null){deciding.understandable.value=formatMetric({value:m('understandable','opMarginCv'),format:'x'});deciding.understandable.label='operating margin variation';}
 if(dossier.tests.economics.result==='fail'&&dossier.tests.economics.reasons.some(r=>/incremental/.test(r))){deciding.economics.value=pct(m('economics','roiic'));deciding.economics.label='incremental return on capital';}
 if(dossier.tests.management.result==='pass'&&m('management','shareCagr')!>T.management.maxShareCagr&&m('management','shareCagr5')!==null){deciding.management.value=pct(m('management','shareCagr5'));deciding.management.label='share-count change · last 5 years';deciding.management.reason='Recent share counts pass the dilution test.';}
 if(dossier.tests.management.pending){deciding.management.value='Checking';deciding.management.reason='Ten years of price history are arriving.';}
 if(dossier.tests.management.result==='fail'&&m('management','retainedEarnings')!>0&&m('management','marketCapGain')!==null&&m('management','marketCapGain')!<m('management','retainedEarnings')!){deciding.management.value=formatMetric({value:m('management','retainedEarnings')!>0?m('management','marketCapGain')!/m('management','retainedEarnings')!:null,format:'x'});deciding.management.label='value created / retained';}
 if(company.kind==='operating'&&returnInfo.label==='Positive earnings, nonpositive capital'){deciding.moat.value='Positive';deciding.moat.label='earnings on nonpositive capital';deciding.moat.series=[];}
 for(const test of tests){
  const d=deciding[test.key];
  if(test.result==='unclear'&&!test.pending&&test.key!=='price')d.reason='Evidence is incomplete; no pass or fail assigned.';
  if(test.result==='fail'){
   const reasons:Partial<Record<TestKey,string>>={understandable:'Earnings or margins are too unpredictable.',moat:'Returns fall below the required threshold.',economics:'Cash conversion or reinvestment fails the bar.',management:'Value creation or dilution fails the bar.',accounting:'Accounting checks raise a red flag.'};
   if(reasons[test.key])d.reason=reasons[test.key]!;
  }
 }
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
  return <div className="one-dossier locks-scroll"><section className="dossier-band insufficient-band">{identity}<div data-testid="insufficient-data"><h2>Not enough reliable history</h2><p>{explanation}</p></div><button className="value-band" data-testid="valuation-open" onClick={()=>setPanel('valuation')}>Valuation unavailable · source checks ↗</button></section><div className="test-tiles">{tests.map((t,i)=><button key={t.key} data-testid={`tile-${t.key}`} className="test-tile unclear" onClick={()=>setPanel(t.key)}><header><span><small>{i+1}</small>{testLabels[t.key]}</span><StatusGlyph result="unclear" label={`${testLabels[t.key]}: not tested`}/></header><div className="tile-number"><strong>Not tested</strong><span>Reliable history required</span></div><p>{t.key==='price'?'A valuation needs a completed quality review.':'Evidence is incomplete; no pass or fail assigned.'}</p><span className="tile-evidence">Source checks ↗</span></button>)}</div><div className="dossier-source">Latest filing {report.period??'arriving'} · {count||'No'} years on file</div>{panel&&<SidePanel title={panel==='valuation'?'Valuation · source checks':`${testLabels[panel]} · source checks`} onClose={()=>setPanel(null)}><h2>Not tested yet</h2><p>{explanation}</p><p>{dossier.valuationReason??'Statements and quote history are being collected.'}</p>{reportUrl&&<a href={reportUrl}>Original filing ↗</a>}</SidePanel>}</div>;
 }
 return <div className="one-dossier locks-scroll">
  <section className="dossier-band">{identity}<div className="one-verdict" data-testid="verdict"><p><strong>{tests.filter(t=>glyph(t)==='pass').length} / 6</strong> tests pass{tests.some(t=>t.pending)?' · checking':''}</p><div>{tests.map(t=><button key={t.key} onClick={()=>setPanel(t.key)} title={testLabels[t.key]}><StatusGlyph result={glyph(t)} label={`${testLabels[t.key]}: ${glyph(t)}`}/><span>{testLabels[t.key]}</span></button>)}</div></div><button className="value-band" data-testid="valuation-open" onClick={()=>setPanel('valuation')}><div><strong>{ratio===null?'—':`${ratio.toFixed(2)}×`}</strong><span>price / value</span><b>Valuation ↗</b></div><CompactValue value={comparable} price={quote?.[0]??null} requiredMos={requiredMos}/>{valuation&&!comparable&&<small>Price is in {company.currency}, value in {valuation.currency}, not compared</small>}</button></section>
  <div className="test-tiles">{tests.map((test,i)=>{const d=deciding[test.key];return <button key={test.key} className={`test-tile ${glyph(test)}`} data-testid={`tile-${test.key}`} onClick={()=>setPanel(test.key)}><header><span><small>{i+1}</small> {testLabels[test.key]}</span><span><StatusGlyph result={glyph(test)} label={`${testLabels[test.key]}: ${glyph(test)}`}/>{test.key==='price'?state.label:test.pending?'Checking':test.result}</span></header><div className="tile-number"><strong className={d.value.length>15?'long-number':''}>{d.value}</strong><span>{d.label}</span></div><MiniSeries series={test.key==='price'?d.series.map(([time,v])=>[new Date(time).getUTCFullYear()+(new Date(time).getUTCMonth()/12),v]):d.series} label={d.chart} threshold={d.threshold}/><p>{d.reason}</p><span className="tile-evidence">Evidence ↗</span></button>;})}</div>
  <div className="dossier-source">{quote?`Price ${dateLabel(quote[1])}${quote[2]==='seed'?' · derived from market cap / shares':''}`:'Quote arriving'}{lastFiscalYear?` · Financials FY${lastFiscalYear}`:''}<span>{reportUrl&&<a href={reportUrl}>Original filing ↗ · </a>}Keys 1–6 open evidence</span></div>
  {panel&&<SidePanel title={panel==='valuation'?'Valuation':`${testLabels[panel]} · evidence`} onClose={()=>setPanel(null)}>{panel==='valuation'||panel==='price'?valuationEvidence:<TestSection test={dossier.tests[panel]} kind={company.kind} events={dossier.events} perShare={dossier.series} lastFiscalYear={lastFiscalYear} requiredMos={requiredMos} priceDate={quote?.[1]} netIncome={dossier.tests.understandable.series.netIncome??dossier.series.netIncome} currency={valuation?.currency??company.currency} reportUrl={reportUrl} valuation={valuation}/>}<p className="source-line">Analysed {dateLabel(dossier.asOf)} · {reportUrl&&<a href={reportUrl}>Original filing ↗ · </a>}<ValueLink href="/method">Method & sources →</ValueLink></p></SidePanel>}
 </div>;
}
