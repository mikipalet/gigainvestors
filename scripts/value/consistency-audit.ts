import {assertDossierConsistency} from '../../lib/value/consistency';
import {chromium,type Locator} from '@playwright/test';
import {readFileSync,readdirSync,writeFileSync,mkdirSync,statfsSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {auditTestSurfaces,auditPriceSurfaces,type SurfaceSnapshot} from '../../lib/value/surface-audit';
import {formatMetric,isCapitalReturn} from '../../lib/value/metric-labels';
import {unpackView} from '../../lib/value/browser-view';
import {ownerReturn} from '../../lib/value/owner-return';
import {sharePrice} from '../../lib/value/listing-details';
import type {Dossier,IndexRow,PriceMap} from '../../lib/value/types';
const [base='http://localhost:3017',stage='.audit/staging',idArg]=process.argv.slice(2);
const read=(f:string)=>JSON.parse(readFileSync(path.join(stage,f),'utf8'));
const ds:Record<string,Dossier>=Object.assign({},...readdirSync(path.join(stage,'store/dossiers')).filter(f=>f.endsWith('.json')).map(f=>read(`store/dossiers/${f}`)));
const prices:PriceMap=Object.assign({},...readdirSync(path.join(stage,'store/prices')).filter(f=>f.endsWith('.json')).map(f=>read(`store/prices/${f}`)));
const rows:IndexRow[]=readdirSync(path.join(stage,'store/index')).filter(f=>/^[A-Z]{2}.json$/.test(f)).flatMap(f=>read(`store/index/${f}`));
const manifest=read('store/meta.json').views;
const browserRows=[manifest.current,...manifest.deferred].flatMap(f=>unpackView(read(`store/${f}`)));
const cohort=idArg?idArg.split(',').map(id=>({id})):read('cohort.json');
if(!idArg)for(const d of Object.values(ds))if(d.b&&!cohort.some((r:{id:string})=>r.id===d.id))cohort.push({id:d.id});
const checks=Object.values(ds).map(d=>assertDossierConsistency(d,prices[d.id]));
console.log(JSON.stringify({publishedDossiers:checks.length,qualityRules:checks.reduce((n,r)=>n+r.rules,0),irrChecks:checks.filter(r=>r.returnChecked).length,cashCovered:checks.filter(r=>r.cashCovered).length}));
async function capture(root:Locator):Promise<SurfaceSnapshot>{return root.evaluate(el=>({
 signals:[...el.querySelectorAll<HTMLElement>('[data-signals]')].map(e=>JSON.parse(e.dataset.signals!)),
 text:(el as HTMLElement).innerText,numbers:((el as HTMLElement).innerText.match(/[-−+]?\d[\d,.]*(?:%|×|bn|[KMBT])?/g)??[]),
 charts:[...el.querySelectorAll<HTMLElement>('[data-series]')].map(e=>({label:e.dataset.seriesLabel!,series:JSON.parse(e.dataset.series!),format:e.dataset.format!,currency:e.dataset.currency!})),
 stats:[...el.querySelectorAll('.tile-support>div,.drawer-numbers>div')].map(e=>[e.querySelector('dt')!.textContent!,e.querySelector('dd')!.textContent!] as [string,string]),
 table:[...el.querySelectorAll('.drawer-years tbody tr')].map(e=>[...e.children].map(c=>c.textContent??'')),
 windows:[...el.querySelectorAll<HTMLElement>('[data-window]')].map(e=>({values:JSON.parse(e.dataset.window!),currency:e.dataset.currency})),
 priceCharts:[...el.querySelectorAll<HTMLElement>('[data-prices]')].map(e=>({prices:JSON.parse(e.dataset.prices!),values:JSON.parse(e.dataset.values!),mos:Number(e.dataset.mos),currency:e.dataset.currency})),
}));}
async function main(){
 const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1728,height:970}}),results:any[]=[];
 const out=path.join(stage,'consistency');mkdirSync(out,{recursive:true});
 const home:Record<string,unknown[]>={};
 const collectHome=async()=>{
  const cards=await page.locator('.main-company,.compact-company-list tbody tr').evaluateAll(els=>els.map((el:HTMLElement|SVGElement)=>({id:el.dataset.company!,value:el.dataset.return,ratio:el.dataset.ratio,text:(el as HTMLElement).innerText,returnText:el.querySelector('.main-return,td')?.textContent,qualityText:el.querySelector('.shelf-quality b,td:last-child')?.textContent,priceText:el.querySelector('.shelf-price')?.textContent})));
  for(const c of cards){if(!ds[c.id])continue;const d=ds[c.id],q=prices[c.id],v=d.valuation?.perShareTrading??d.valuation?.perShare,owner=ownerReturn(d.valuation,d.company.currency,d.company.marketCapUsd,q?.[0]??null);const wanted=v&&q?q[0]/(v.mid*(1-(d.requiredMos??.25))):null;
   assert.equal(c.value===''?null:Number(c.value),owner?.expected??null,`${c.id} rendered home return`);
   assert.equal(c.ratio===''?null:Number(c.ratio),wanted,`${c.id} rendered home price distance`);
   if(owner)assert.equal(c.returnText?.replace('−','-'),`${(owner.expected*100).toFixed(1)}%`,`${c.id} visible home return rounding`);
   const quality=browserRows.find(r=>r.id===c.id)?.quality;
   if(c.qualityText&&quality)assert.ok(c.qualityText.includes(quality.value==='unlimited'?'>100%':formatMetric({value:quality.value,format:'pct',returnRatio:true})),`${c.id} visible home capital return`);
   if(c.priceText&&v&&q)for(const n of [q[0],v.mid*(1-(d.requiredMos??.25))])assert.ok(c.priceText.includes(sharePrice(n,d.company.currency)),`${c.id} visible home quote / buy price`);
   (home[c.id]??=[]).push(c);
  }
 };
 try{
 await page.goto(`${base}/?markets=all&gate=0`,{waitUntil:'networkidle',timeout:60000});await page.locator('.main-view[aria-busy=false]').waitFor();await collectHome();
 for(const button of await page.locator('.main-more,.table-toggle').all()){
  await button.click();await page.locator('dialog').waitFor();await collectHome();
  const next=page.getByRole('navigation',{name:'Company pages'}).getByRole('button',{name:'→',exact:true});
  while(await next.count()&&await next.isEnabled()){await next.click();await collectHome();}
  await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'detached'});
 }
 writeFileSync(path.join(out,'home.json'),JSON.stringify(home,null,2));
 for(const {id,published}of cohort){const disk=statfsSync('/');if(disk.bavail*disk.bsize<5*1024**3)throw Error('DISK STOP below 5 GiB');
 const d=ds[id],failures:string[]=[],surfaces:Record<string,SurfaceSnapshot>={};
 const check=(fn:()=>void)=>{try{fn();}catch(e){failures.push((e as Error).message);}};
 const response=await page.goto(`${base}/${id.toLowerCase()}`,{waitUntil:'networkidle',timeout:60000});
 if(!d){check(()=>{assert.notEqual(published,true,`${id} expected published dossier disappeared`);assert.equal(response?.status(),404,`${id} absent dossier must return 404`);});check(()=>assert.ok(!rows.some(r=>r.id===id)&&!browserRows.some(r=>r.id===id),'unpublished company leaks to index'));results.push({id,status:'unpublished',failures,note:'No published dossier; number-bearing surfaces are absent'});continue;}
 await page.locator('.one-dossier').waitFor();
 surfaces.dossier=await capture(page.locator('.one-dossier'));
 const reference=page.locator('.reference-metrics');if(await reference.count())surfaces.top=await capture(reference);
 if(surfaces.top&&!d.valuation)check(()=>{
  const text=surfaces.top.text;
  if(prices[id])assert.ok(text.includes(sharePrice(prices[id][0],d.company.currency)),`${id} top quote without valuation`);
  const count=Object.values(d.tests).filter(t=>t.result==='pass').length;
  assert.ok(text.includes(`${count} / 5 pass`),`${id} quality count`);
  assert.ok(text.includes(`${d.historyCoverage?.years??'—'} years`),`${id} annual history count`);
  if(d.company.marketCapUsd!=null)assert.ok(text.includes(formatMetric({value:d.company.marketCapUsd,format:'money',currency:'USD'})),`${id} top market value`);
 });
 for(const key of ['understandable','moat','economics','management','accounting'] as const){
 const tile=page.locator(`[data-testid=tile-${key}]`);if(!await tile.count())continue;
 surfaces[`tile-${key}`]=await capture(tile);await tile.locator('.tile-open').click();await page.locator('dialog .evidence-layout').waitFor();
 surfaces[`drawer-${key}`]=await capture(page.locator('dialog'));
 check(()=>auditTestSurfaces(d,d.tests[key],surfaces[`tile-${key}`],surfaces[`drawer-${key}`]));
 await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'detached'});
 }
 const price=page.locator('[data-testid=tile-price]');if(await price.count()){
 surfaces.price=await capture(price);await price.locator('.tile-open').click();await page.locator('dialog .evidence-layout').waitFor();surfaces.valuation=await capture(page.locator('dialog'));
 check(()=>auditPriceSurfaces(d,rows.find(r=>r.id===id),prices[id]??null,surfaces.top,surfaces.price,surfaces.valuation));
 await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'detached'});
 }
 surfaces.financial=await capture(page.locator('.financial-strip'));
 const highlights=await page.locator('[data-financial]').evaluateAll(els=>els.map(e=>({key:e.dataset.financial!,fy:Number(e.dataset.fy),text:e.querySelector('b')?.textContent})));
 for(const {key,fy,text}of highlights){const source=d.series[key];if(!source)continue;const end=Math.max(...source.map(p=>p[0])),series=source.filter(p=>p[0]>end-10),latest=series.filter(p=>p[1]!=null).at(-1);
 check(()=>{assert.equal(fy,latest?.[0],`${id} ${key} latest year`);assert.equal(text,formatMetric({value:latest?.[1]??null,format:/Margin|roe/.test(key)?'pct':key==='shares'?'count':'money',currency:d.reportingCurrency??d.valuation?.currency??d.company.currency,returnRatio:isCapitalReturn(key)}),`${id} ${key} latest value`);const chart=surfaces.financial.charts.find(c=>c.series.some(p=>p[0]===fy&&p[1]===latest?.[1]));if(series.filter(p=>p[1]!=null).length>0)assert.deepEqual(chart?.series,series,`${id} ${key} history`);});
 }
 const row=browserRows.find(r=>r.id===id);if(row){check(()=>{assert.ok(home[id]?.length,`${id} missing rendered home/list row`);const expected=ownerReturn(d.valuation,d.company.currency,d.company.marketCapUsd,prices[id]?.[0]??null)?.expected??null;assert.equal(row.expected,expected,`${id} home browser JSON expected return`);assert.equal(row.b,d.b,`${id} home buy flag`);});}
 writeFileSync(path.join(out,`${id}.json`),JSON.stringify({id,failures,home:home[id]??[],homeNote:home[id]?'Captured home cards/list rows':'No numeric home row available',surfaces},null,2));results.push({id,status:failures.length?'fail':'pass',failures,surfaces:Object.keys(surfaces),numbers:Object.values(surfaces).reduce((n,s)=>n+s.numbers.length,0)});console.log(id,failures.length?failures.join('\n'):'PASS');
 }}finally{await browser.close();writeFileSync(path.join(out,'report.json'),JSON.stringify(results,null,2));}
 if(results.some(r=>r.failures.length))process.exitCode=1;
 console.log(JSON.stringify({companies:results.length,passed:results.filter(r=>r.status==='pass').length,unpublished:results.filter(r=>r.status==='unpublished').length,failed:results.filter(r=>r.failures.length).length}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
