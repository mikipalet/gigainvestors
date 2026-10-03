'use client';
import {ruleReading} from '@/lib/value/rule-reading';
import {returnModelCopy} from '@/lib/value/owner-return';
import type {Dossier,TestOutcome,PriceMap} from '@/lib/value/types';
import {T} from '@/lib/value/config';
import {primaryTileMetric,tileSentence} from '@/lib/value/tile-metric';
import {formatMetric,displayReturnText} from '@/lib/value/metric-labels';
import {sharePrice} from '@/lib/value/listing-details';
import {comparableValuation} from '@/lib/value/site-valuation';
import {ownerReturn,cashCoveredReturnCopy} from '@/lib/value/owner-return';
import {retainedWindow,yearTable} from '@/lib/value/drawer-data';
import {useWidth} from '@/lib/value/viz/use-width';
import {ThresholdSeries} from './viz/ThresholdSeries';
import {MiniPrice,MiniDollar} from './viz/TileCharts';
import {FilingSignals} from './DossierNumbers';
import {JudgementLine} from './BusinessSection';
import {FilingEvidence} from './FilingEvidence';
import {AnnualValueBar} from './AnnualValueBar';

function yearLabel(label:string){return label.replace('Earnings','Profit').replace('Cash / earnings','Cash / profit').replace('Working capital / sales','WC / sales');}
function Numbers({items}:{items:Array<[string,string]>}){return <dl className="drawer-numbers">{items.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd>{' '}</div>)}</dl>}
function QualityChart({dossier,test}:{dossier:Dossier;test:TestOutcome}){
 const {ref,width}=useWidth(),currency=dossier.reportingCurrency??dossier.company.currency;
 const metric=primaryTileMetric(test,dossier.company.kind,dossier.tests.understandable.series.netIncome??dossier.series.netIncome),warnings=metric.id==='financialRedFlags',series=metric.series;
 const book=dossier.tests.economics?.series.bookPerShare??dossier.series.bookPerShare??[];
 const bookContext=test.key==='accounting'&&'financialRedFlags' in test.metrics&&!series.some(p=>p[1]!=null)&&!test.jev.some(a=>a.probability!==null&&Number.isFinite(a.probability))&&book.some(p=>p[1]!=null);
 if(bookContext)return <div ref={ref as React.RefObject<HTMLDivElement>} className="panel-chart drawer-chart"><ThresholdSeries dense height={Math.max(56,Math.min(96,width*.15))} label={dossier.company.kind==='bank'?'Tangible common book per share':'Common book per share'} series={book} domain={[book[0][0],book.at(-1)![0]]} currency={currency} format="money" threshold={0} better="higher"/></div>;
 return <div ref={ref as React.RefObject<HTMLDivElement>} className="panel-chart drawer-chart">{retainedWindow(test)?<MiniDollar fluid dense currency={currency} retained={test.metrics.retainedEarnings} created={test.metrics.marketCapGain} first={test.metrics.retainedStartFy} last={test.metrics.retainedEndFy}/>:!series.some(p=>p[1]!=null&&Number.isFinite(p[1]))?<FilingSignals test={test} dense/>:series.length?<ThresholdSeries dense height={Math.max(56,Math.min(96,width*.15))} allowedBelow={test.key==='moat'&&dossier.company.kind!=='operating'?(dossier.company.kind==='bank'?.05:undefined):undefined} label={metric.chart} series={series} domain={[series[0][0],series.at(-1)![0]]} currency={currency} format={warnings?'money':metric.chartFormat??(metric.format==='money'?'money':metric.format==='pct'||test.key==='understandable'?'pct':'ratio')} threshold={warnings||metric.chartThreshold===null?undefined:metric.chartThreshold??(test.key==='understandable'?undefined:metric.threshold)} better={metric.chartBetter??metric.better}/>:<p>{test.reasons.map(displayReturnText).join(' ')}</p>}</div>;
}
// Financial companies use earnings and equity rather than an operating cash conversion test.
// Keep the same fiscal window while exposing the underlying capital/share context.
function evidenceYears(dossier:Dossier,test:TestOutcome){
 const table=yearTable(dossier,test);
 if(test.key==='accounting'&&dossier.company.kind==='operating'){
  const series=dossier.series.netIncome??[];
  if(series.some(([,value])=>value!==null)){
   table.columns.push({key:'contextNetIncome',label:'Profit',format:'money',series});
   table.rows.forEach(row=>row.values.push(series.find(([fy])=>fy===row.year)?.[1]??null));
  }
 }
 if(dossier.company.kind==='operating'||!['understandable','accounting'].includes(test.key))return table;
 const extras=test.key==='understandable'?
  [{key:'shares',label:'Diluted shares',format:'count' as const,series:dossier.series.shares??[]}]:
  [{key:'bookPerShare',label:'Book / share',format:'money' as const,series:dossier.series.bookPerShare??[]},{key:'commonRoe',label:'Common ROE',format:'pct' as const,series:dossier.series.commonRoe??[]}];
 for(const column of extras){
  if(table.columns.some(c=>c.key===column.key)||!column.series.some(p=>p[1]!=null))continue;
  table.columns.push(column);
  table.rows.forEach(row=>row.values.push(column.series.find(([year])=>year===row.year)?.[1]??null));
 }
 return table;
}
export function EvidencePanel({dossier,test}:{dossier:Dossier;test:TestOutcome}){
 const currency=dossier.reportingCurrency??dossier.valuation?.currency??dossier.company.currency;
 const metric=primaryTileMetric(test,dossier.company.kind,dossier.tests.understandable.series.netIncome??dossier.series.netIncome),table=evidenceYears(dossier,test),window=retainedWindow(test);
 const values=metric.series.flatMap(([,n])=>n!=null&&Number.isFinite(n)?[n]:[]).sort((a,b)=>a-b),mid=Math.floor(values.length/2);
 const fmt=(value:number|null)=>formatMetric({value,format:metric.chartFormat==='money'?'money':metric.chartFormat==='index'?'count':metric.chartFormat==='pct'||metric.id==='opMarginCv'?'pct':metric.format,currency,returnRatio: /roic|roe|rote/i.test(metric.chart)});
 const median=values.length?values.length%2?values[mid]:(values[mid-1]+values[mid])/2:null;
 const observed=metric.series.filter((p):p is [number,number]=>p[1]!=null&&Number.isFinite(p[1]));
 const latest=observed.at(-1)?.[1]??null,worstValue=metric.id==='opMarginCv'||(metric.chartBetter??metric.better)==='higher'?values[0]:values.at(-1);
 const worstYear=observed.find(([,value])=>value===worstValue)?.[0];
 let stats:Array<[string,string]>=window?[['Retained',formatMetric({value:window.retained,format:'money',currency})],['Value created',formatMetric({value:window.created,format:'money',currency})],['Shares / yr',formatMetric({value:test.metrics.shareCagr??null,format:'pct'})],['$1 test',window.created>=window.retained?'Pass':'Fail'],['Window',`${window.start}–${window.end}`]]:values.length?[[`${values.length}y median`,fmt(median)],[`Worst · ${worstYear}`,fmt(worstValue??null)],[`Latest · ${observed.at(-1)?.[0]}`,fmt(latest)],['Passing bar',metric.id==='opMarginCv'?`CV ≤ ${formatMetric({value:metric.threshold,format:'x'})}`:metric.chartThreshold===null?'Over the window':`${(metric.chartBetter??metric.better)==='higher'?'≥':'<'} ${fmt(metric.chartThreshold??metric.threshold)}`],['Window',`${observed[0]?.[0]}–${observed.at(-1)?.[0]}`]]:[[metric.label,formatMetric({value:metric.value,format:metric.format,currency})],['Passing bar',formatMetric({value:metric.threshold,format:metric.format,currency})],['Years',String(table.rows.length)]];
 if('financialRedFlags' in test.metrics){
  const book=(dossier.tests.economics?.series.bookPerShare??dossier.series.bookPerShare??[]).filter((p):p is [number,number]=>p[1]!==null&&Number.isFinite(p[1])&&table.rows.some(row=>row.year===p[0]));
  const first=book[0],last=book.at(-1);
  if(first&&last){
   stats=[[dossier.company.kind==='bank'?'Tangible book / share':'Book / share',formatMetric({value:last[1],format:'money',currency})]];
   if(first[1]>0&&last[1]>0&&last[0]>first[0])stats.push(['Book only / yr',formatMetric({value:(last[1]/first[1])**(1/(last[0]-first[0]))-1,format:'pct'})]);
   if(test.metrics.restatementYears!=null)stats.push(['Restatement flags',String(test.metrics.restatementYears)]);
   stats.push(['Window',`${first[0]}–${last[0]}`]);
  }
 }
 const answer=tileSentence(test,metric,dossier.company.kind);
 return <article className="evidence-layout" data-test={test.key} data-kind={dossier.company.kind} data-window-only={table.rows.every(row=>row.pass===null)}><p className="panel-answer">{answer||'Read the financial history and filing evidence together.'}</p><QualityChart dossier={dossier} test={test}/><Numbers items={stats}/><div className="drawer-bottom"><section className="drawer-years"><h3>Year by year <small>{currency}</small></h3><table><thead><tr><th scope="col">FY</th>{table.columns.map(c=><th scope="col" key={c.key} title={c.label} className={c.key==='contextNetIncome'?'annual-context':c.key==='commonRoe'?'annual-secondary':undefined}>{yearLabel(c.label)}</th>)}<th scope="col" title={table.markLabel}>Bar</th></tr></thead><tbody>{table.rows.map((r,ri)=><tr key={r.year}><th scope="row">{r.year}</th>{r.values.map((v,i)=><td key={i} className={table.columns[i].key==='contextNetIncome'?'annual-context':table.columns[i].key==='commonRoe'?'annual-secondary':undefined}><span className="annual-field">{yearLabel(table.columns[i].label)} </span>{v==null?'—':formatMetric({value:v,format:table.columns[i].format,currency,returnRatio:/roic|roe|rote/i.test(table.columns[i].key)}).replace(`${currency} `,'')}{v!==null&&ri>0&&table.rows[ri-1].values[i]!=null&&table.rows[ri-1].values[i]!==0&&<small className="annual-change" title="Change from the previous fiscal year">Δ {table.columns[i].format==='pct'?`${((v-table.rows[ri-1].values[i]!)*100).toFixed(1)}pp`:`${((v-table.rows[ri-1].values[i]!)/Math.abs(table.rows[ri-1].values[i]!)*100).toFixed(1)}%`}</small>}{v!==null&&<AnnualValueBar value={v} values={table.rows.map(row=>row.values[i])}/>}</td>)}<td aria-label={r.pass===null?'Window assessment':r.pass?'Meets annual bar':'Below annual bar'} className={r.pass===null?'':r.pass?'year-pass':'year-fail'}>{r.pass===null?'·':r.pass?'✓':'×'}</td></tr>)}</tbody></table><p className="drawer-table-note">{table.markLabel==='Window test'?'Assessed over the full window; annual values are context.':`${table.markLabel}: ✓ meets · × below.${dossier.predecessorHistory?.length?'':' The overall test also uses multi-year rules.'}`}{test.key==='moat'&&dossier.company.kind==='bank'?` Median ≥ ${formatMetric({value:metric.threshold,format:'pct'})}; ≥ ${formatMetric({value:dossier.company.kind==='bank'?.05:T.moat.roicSecondLowest,format:'pct'})} in all but one reported year.`:''}{test.key==='moat'&&dossier.company.kind==='operating'?(dossier.predecessorHistory?.length?' ROIC excluding acquisitions decides; including acquisitions needs a ten-year median ≥15% for compounders.':' ROIC excluding acquisitions decides this test; ROIC including acquisitions is shown separately in the table and needs a ten-year median of at least 15% for the compounder tier.') :''}{window?' Profit − div. excludes buybacks and other equity movements.':''}</p></section><FilingEvidence dossier={dossier} test={test}><h4 className="how-decided">How we decided</h4>{'financialRedFlags' in test.metrics&&<p className="accounting-basis">{(()=>{const point=(dossier.tests.economics?.series.bookPerShare??dossier.series.bookPerShare??[]).filter(([,value])=>value!==null).at(-1);return point&&<>{dossier.company.kind==='bank'?'Tangible common':'Common'} book per share: {formatMetric({value:point[1],format:'money',currency})} in FY{point[0]}; must be positive. </>;})()}{test.metrics.restatementYears!=null&&<>Reported restatement flags: {test.metrics.restatementYears}; none allowed.</>}</p>}<ul className="applied-rules">{ruleReading(test,dossier.company.kind).checks.filter(c=>c.pass!==null).map((c,i)=><li key={i}>{c.pass?"✓":"×"} {c.text}</li>)}</ul><JudgementLine test={test}/></FilingEvidence></div></article>;
}
export function ValuationPanel({dossier,quote}:{dossier:Dossier;quote:PriceMap[string]|null}){
 const v=dossier.valuation,comparable=comparableValuation(v,dossier.company.currency),owner=ownerReturn(v,dossier.company.currency,dossier.company.marketCapUsd,quote?.[0]??null),mos=dossier.requiredMos??.25;
 if(!v)return null;
 const pct=(n:number)=>`${(n*100).toFixed(1)}%`,money=(n:number|null)=>sharePrice(n,dossier.company.currency);
 const history=dossier.valueHistory??[],prices=dossier.priceHistory??[];
 const annualQuotes=history.flatMap(([fy])=>{const point=prices.filter(([date])=>Number(date.slice(0,4))===fy).at(-1);return point?[[fy,point[1]] as const]:[];});
 const annualPrices=annualQuotes.length>1;
 return <article className="evidence-layout" data-kind={dossier.company.kind} data-valuation data-sparse-history={history.length<=4} data-price-history={annualPrices}><p className="panel-answer">{dossier.b?'The price clears the safety discount and required return.':'Wait for a price that clears the safety discount and required return.'}</p><div className="panel-chart drawer-chart"><MiniPrice dossier={dossier} quote={quote} dense fluid minimumHeight={60}/></div><Numbers items={[["Share price",money(quote?.[0]??null)],["Estimated value",money(comparable?.perShare.mid??null)],["Buy price",money(comparable?comparable.perShare.mid*(1-mos):null)],['Expected / yr',owner?pct(owner.expected):cashCoveredReturnCopy(v,dossier.company.currency,quote?.[0]??null)?'Cash covers price':'—'],['Required',pct(v.discountRate)],['Safety discount',pct(mos)],...(comparable&&quote?[['Price / value',pct(quote[0]/comparable.perShare.mid)] as [string,string]]:[])]}/><div className="drawer-bottom"><section className="drawer-years"><h3>Year by year <small>{dossier.company.currency}</small></h3><table><thead><tr><th>FY</th><th>Price</th><th>Value</th><th>Buy below</th><th className="annual-comparison">Price / value</th><th>Bar</th></tr></thead><tbody>{history.map(([fy,low,mid,high])=>{const p=prices.filter(p=>Number(p[0].slice(0,4))===fy).at(-1)?.[1];return <tr key={fy}><th scope="row">{fy}</th><td data-empty={p==null}><span className="annual-field">Price </span>{money(p??null).replace(`${dossier.company.currency} `,'')}{p!=null&&<AnnualValueBar value={p} values={history.map(([year])=>prices.filter(point=>Number(point[0].slice(0,4))===year).at(-1)?.[1]??null)}/>}</td><td><span className="annual-field">Value </span>{money(mid).replace(`${dossier.company.currency} `,'')}<small className="valuation-range"> (range {low.toFixed(2)}–{high.toFixed(2)})</small><AnnualValueBar value={mid} values={history.map(row=>row[2])}/></td><td><span className="annual-field">Buy below </span>{money(mid*(1-mos)).replace(`${dossier.company.currency} `,'')}<AnnualValueBar value={mid*(1-mos)} values={history.map(row=>row[2]*(1-mos))}/></td><td className="annual-comparison" data-empty={p==null}><span className="annual-field">Price / value </span>{p!=null&&mid>0?<>{pct(p/mid)}<AnnualValueBar value={p/mid} values={history.map(([year,,value])=>{const price=prices.filter(point=>Number(point[0].slice(0,4))===year).at(-1)?.[1];return price!=null&&value>0?price/value:null;})}/></>:'—'}</td><td aria-label={p==null?'No year-end quote':p<=mid*(1-mos)?'Meets price bar':'Above price bar'}>{p==null?'·':p<=mid*(1-mos)?'✓':'×'}</td></tr>;})}</tbody></table>{!annualPrices&&annualQuotes.map(([fy,p])=><p className="drawer-table-note annual-sparse-quote" key={fy}>FY{fy} year-end price {money(p)}.</p>)}<p className="drawer-table-note">{annualPrices?'Year-end price against the safety discount; return uses the same valuation cash flows.':'Annual estimates use the same safety discount and valuation cash flows.'}</p></section><FilingEvidence dossier={dossier}><p>{returnModelCopy(v,dossier.company.currency)}</p>{cashCoveredReturnCopy(v,dossier.company.currency,quote?.[0]??null)&&<p>{cashCoveredReturnCopy(v,dossier.company.currency,quote?.[0]??null)}</p>}<p>{v.method==='nav'?'NAV plus reinvested dividends':v.method==='book_value'?'Book value and returns on equity':'Cash left for owners after maintaining the business'} · {pct(Math.abs(v.growth))} {v.growth<0?'annual decline':'growth'}.</p><dl className="valuation-inputs">{v.capitalReturns&&<><div><dt>ROIC excluding acquisitions</dt><dd>{formatMetric({value:v.capitalReturns.excludingGoodwill,format:'pct',returnRatio:true})}</dd></div><div><dt>ROIC including acquisitions · compounder minimum 15%</dt><dd>{formatMetric({value:v.capitalReturns.includingAcquisitions,format:'pct',returnRatio:true})}</dd></div></>}{v.bridge.map(r=><div key={r.label}><dt>{r.label}</dt><dd>{formatMetric({value:r.value,format:/shares/i.test(r.label)?'count':/return|CAGR/i.test(r.label)?'pct':/factor|price to book/i.test(r.label)?'x':'money',currency:v.currency})}</dd></div>)}</dl></FilingEvidence></div></article>;
}
