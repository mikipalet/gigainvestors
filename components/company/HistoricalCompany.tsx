'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {fetchValueData} from '@/lib/value/data-source';
import {type Dossier,type SnapshotRow,QUALITY_TESTS} from '@/lib/value/types';
import {quarterEnd} from '@/lib/value/time-travel';
import {CompanyLogo} from '@/components/value/CompanyLogo';
import {MiniPrice} from '@/components/value/viz/TileCharts';
import {testLabels} from '@/components/value/TestChips';
import {sharePrice} from '@/lib/value/listing-details';
import {companyTicker} from '@/lib/company-route';
export function HistoricalCompany({dossier,q,children}:{dossier:Dossier;q:string;children?:ReactNode}){
 const [result,setResult]=useState<{q:string;row:SnapshotRow|null}>();
 useEffect(()=>{let active=true;void fetchValueData<SnapshotRow[]>(`history/${q}.json`).then(rows=>{if(active)setResult({q,row:rows.find(r=>r[0]===dossier.id)??null});}).catch(()=>{if(active)setResult({q,row:null});});return()=>{active=false;};},[q,dossier.id]);
 const row=result?.q===q?result.row:null,cutoff=quarterEnd(q);
 const history=dossier.priceHistory?.filter(([date])=>date<=cutoff)??[];
 const price=row?.[5]?.price??history.at(-1)?.[1]??null;
 const expected=row?.[7]?.expected;
 const verdict=row?row[1].includes('F')?'Fails quality':row[1]==='PPPPP'?row[3]?'A wonderful business at a fair price':'A wonderful business at too high a price':'':'';
 return <div className="one-dossier historical-company locks-scroll" aria-busy={result?.q!==q}>
  <section className="dossier-band"><div className="company-heading"><CompanyLogo src={dossier.company.logo} name={dossier.company.name}/><div><h1>{dossier.company.name}</h1><p>{companyTicker(dossier.id)} · {q}</p></div></div><div className="one-verdict">{verdict&&<p className="plain-verdict">{verdict}</p>}{row?.[7]&&<p>Annual base FY{row[7].annual} · earnings through {row[7].ttm}</p>}</div><div className="reference-metrics">{price!==null&&<span>Share price <b>{sharePrice(price,dossier.company.currency)}</b></span>}{row?.[5]?.buyPrice!=null&&<span>Buy below <b>{sharePrice(row[5].buyPrice,dossier.company.currency)}</b></span>}{expected!=null&&<span>Expected / year <b>{(expected*100).toFixed(1)}%</b></span>}</div></section>
  {children}
  <div className="historical-checks">{row&&<section aria-label="Five business quality tests" className="historical-quality">{QUALITY_TESTS.map((key,i)=>{const status=row[1][i];return status==='P'||status==='F'?<article className={`historical-test verdict-${status==='P'?'pass':'fails'}`} key={key}><h2>{testLabels[key]}</h2><strong>{status==='P'?'✓ Pass':'× Fails'}</strong>{row[7]?.qualityLtm?.[key]&&<p>{row[7].qualityLtm[key]!.label}</p>}</article>:null;})}</section>}{history.length>1&&<section className="historical-price" aria-label="Price history"><h2>Price through {q}</h2><MiniPrice dossier={{...dossier,priceHistory:history}} quote={null} priceOnly fluid minimumHeight={120}/>{row?.[5]?.buyPrice!=null&&<p>Buy price {sharePrice(row[5].buyPrice,dossier.company.currency)} · {row[3]?'At a fair price':'Above the buy price'}</p>}</section>}</div>
  <div className="dossier-source">Quarter-end price · historical numerical checklist</div>
 </div>;
}
