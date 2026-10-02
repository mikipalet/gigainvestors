'use client';
import type {Dossier,PriceMap} from '@/lib/value/types';
import {monthLabel,sourceQuote} from '@/lib/value/price-story/compose';
import {formatMetric} from '@/lib/value/metric-labels';
import {MiniPrice} from './viz/TileCharts';
import styles from './PriceStory.module.css';
export function PriceStoryPanel({dossier,quote}:{dossier:Dossier;quote:PriceMap[string]|null}){
 const story=dossier.priceStory!;
 const cutoff=String(Number(story.asOf.slice(0,4))-5)+story.asOf.slice(4,7);
 const history={...dossier,priceHistory:dossier.priceHistory?.filter(p=>p[0]>=cutoff)};
 const earnings=(dossier.series.ownerEarningsPerShare??[]).filter((p):p is [number,number]=>p[1]!==null&&Number.isFinite(p[1])).slice(-11);
 const last=earnings.at(-1),first=last?earnings.find(p=>p[0]===last[0]-10):null;
 const actual=last&&first&&last[1]>0&&first[1]>0?Number((((last[1]/first[1])**.1-1)*100).toFixed(1)):null;
 const years=[...new Set(story.facts.flatMap(f=>f.points.map(p=>p[0])))].sort((a,b)=>a-b).slice(-10);
 const flags=(dossier.businessDepth?.flags??[]).filter(f=>f.basis==='computed'&&f.evidence.length>0).slice(0,2);
 const currency=dossier.reportingCurrency??dossier.company.currency;
 return <article className={`evidence-layout ${styles.panel}`} style={{display:'flex',height:'auto'}} data-testid="price-story-panel">
  <section className={styles.price}><h3>{dossier.company.name}</h3><MiniPrice dossier={history} quote={quote} priceOnly events={story.events} height={115}/></section>
  {story.events.length>0&&<ol className={styles.events}>{story.events.map((event,i)=><li key={event.id}><b>{i+1}</b><a href={event.url} target="_blank" rel="noreferrer">{sourceQuote(event)}</a></li>)}</ol>}
  {story.needs&&<section className={styles.needs}><h3>What the price needs</h3><p>{story.needs}.</p>{actual!==null&&<p>Cash profits per share {actual<0?'shrank':'grew'} {Math.abs(actual)}% a year over {first![0]}–{last![0]}.</p>}</section>}
  {story.facts.length>0&&<section className={styles.facts}><h3>What the filings say</h3><p>{story.facts.map((fact,i)=><span key={fact.label}>{i>0?' · ':''}<a href={fact.url} target="_blank" rel="noreferrer">{fact.text} ({fact.label.match(/FY.*/)?.[0]})</a></span>)}</p><table><caption>Annual filing figures · {currency}</caption><thead><tr><th>Year</th>{story.facts.map(f=><th key={f.label}>{f.label.split(' · ')[0]}</th>)}</tr></thead><tbody>{years.map(year=><tr key={year}><th>{year}</th>{story.facts.map(f=>{const value=f.points.find(p=>p[0]===year)?.[1];return <td key={f.label}>{value!=null?formatMetric({value,format:f.unit==='percent'?'pct':'money',currency:''}):''}</td>;})}</tr>)}</tbody></table>{flags.map(flag=><p key={flag.id} className={styles.flag} data-tone={flag.tone}><a href={flag.evidence[0].url} target="_blank" rel="noreferrer">{flag.label}</a></p>)}</section>}
  <footer>Prices {story.priceDate?monthLabel(story.priceDate):monthLabel(story.asOf)}{dossier.report.filed&&<> · Filing {monthLabel(dossier.report.filed)}</>}</footer>
 </article>;
}
