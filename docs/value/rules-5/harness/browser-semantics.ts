import {sharePrice} from '../../../../lib/value/listing-details';
import {chromium,expect,type Locator} from '@playwright/test';
import {readFileSync,readdirSync,writeFileSync,statfsSync,mkdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {auditTestSurfaces,auditPriceSurfaces,type SurfaceSnapshot} from '../../../../lib/value/surface-audit';
import {primaryTileMetric,tileSentence} from '../../../../lib/value/tile-metric';
const arm=process.argv[2]??'candidate';
const base=arm==='live'?'http://127.0.0.1:3193':'http://127.0.0.1:3192',store='/Users/miki/data/value-rules/.audit/rules-5/'+(arm==='live'?'baseline':'candidate-final');
import {shardOf} from '../../../../lib/value/shard';
const ids=['GOOGL.US','NVDA.US','MSFT.US','AAPL.US','COST.US'];
const ds=Object.fromEntries(ids.map(id=>[id,JSON.parse(readFileSync(store+'/dossiers/'+shardOf(id)+'.json','utf8'))[id]]));
const rows=Object.assign({},...readdirSync(store+'/index').map(f=>Object.fromEntries(JSON.parse(readFileSync(store+'/index/'+f,'utf8')).map((r:any)=>[r.id,r]))));
const prices=Object.assign({},...readdirSync(store+'/prices').map(f=>JSON.parse(readFileSync(store+'/prices/'+f,'utf8'))));
async function capture(root:Locator):Promise<SurfaceSnapshot>{return root.evaluate(el=>({
 accountingContext:el.querySelector('.accounting-basis')?.textContent??'',
 signals:[...el.querySelectorAll<HTMLElement>('[data-signals]')].map(e=>JSON.parse(e.dataset.signals!)),
 text:(el as HTMLElement).innerText,numbers:((el as HTMLElement).innerText.match(/[-−+]?\d[\d,.]*(?:%|×|bn|[KMBT])?/g)??[]),
 charts:[...el.querySelectorAll<HTMLElement>('[data-series]')].map(e=>({label:e.dataset.seriesLabel!,series:JSON.parse(e.dataset.series!),format:e.dataset.format!,currency:e.dataset.currency!})),
 stats:[...el.querySelectorAll('.tile-support>div,.drawer-numbers>div')].map(e=>[e.querySelector('dt')!.textContent!,e.querySelector('dd')!.textContent!] as [string,string]),
 table:[...el.querySelectorAll('.drawer-years tbody tr')].map(e=>[...e.children].map(c=>c.querySelector('.quality-ltm-label')?.textContent??[...c.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('').trim())),
 tableHeaders:[...el.querySelectorAll('.drawer-years thead th')].map(c=>c.textContent??''),
 windows:[...el.querySelectorAll<HTMLElement>('[data-window]')].map(e=>({values:JSON.parse(e.dataset.window!),currency:e.dataset.currency})),
 priceCharts:[...el.querySelectorAll<HTMLElement>('[data-prices]')].map(e=>({prices:JSON.parse(e.dataset.prices!),values:JSON.parse(e.dataset.values!),mos:Number(e.dataset.mos),currency:e.dataset.currency})),
}));}

async function main(){
const out='/Users/miki/data/value-rules/.audit/rules-5/evidence/semantics-'+arm;mkdirSync(out,{recursive:true});
const browser=await chromium.launch();const results:any[]=[];
try{
 for(const [width,height] of [[1728,970],[390,844]])for(const id of ids){
  for(const path of ['/',homedir()+'/data']){const s=statfsSync(path);if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP');}
  const page=await browser.newPage({viewport:{width,height}}),errors:string[]=[];await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());page.on('pageerror',e=>errors.push(e.message));
  try{
   const response=await page.goto(base+'/s/'+id.toLowerCase(),{waitUntil:'networkidle',timeout:90000});expect(response?.ok()).toBe(true);
   const record:any={id,width,height,pass:true,tests:[]};results.push(record);
   for(const key of ['understandable','moat','economics']){
    const tile=page.locator('[data-testid=tile-'+key+']');await expect(tile).toHaveClass(new RegExp(ds[id].tests[key].result));
    const a=await capture(tile);await tile.locator('.tile-open').click();await page.locator('dialog .evidence-layout').waitFor();
    const t=ds[id].tests[key],metric=primaryTileMetric(t,ds[id].company.kind,ds[id].tests.understandable.series.netIncome??ds[id].series.netIncome);
    await expect(page.locator('dialog')).toContainText(tileSentence(t,metric,ds[id].company.kind),{useInnerText:true});
    if(t.provisional)await expect(page.locator('dialog')).toContainText(t.provisional.label,{useInnerText:true});
    const b=await capture(page.locator('dialog'));let auditError:string|undefined;
    try{auditTestSurfaces(ds[id],ds[id].tests[key],a,b);}catch(e){auditError=String(e);}
    const sharedSeriesConflicts=Object.entries(t.series).flatMap(([name,series]:any)=>ds[id].series[name]?(series as any[]).flatMap(([fy,value])=>{const prior=ds[id].series[name].find((p:any)=>p[0]===fy);return prior&&JSON.stringify(prior[1])!==JSON.stringify(value)?[{series:name,fy,test:value,dossier:prior[1]}]:[];}):[]);
    const geometry=await page.locator('dialog').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,viewport:innerWidth};});
    expect(geometry.left).toBeGreaterThanOrEqual(-1);expect(geometry.right).toBeLessThanOrEqual(width+1);
    await page.screenshot({path:out+'/'+id+'-'+width+'-'+key+'.png'});
    record.tests.push({key,pass:!auditError,error:auditError,sharedSeriesConflicts,surfaces:{tile:a,drawer:b},geometry});await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'detached'});
   }
   const price=page.locator('[data-testid=tile-price]');
   if(await price.count()){
    record.hiddenMath=await price.locator('.valuation-math').evaluateAll(els=>els.map(el=>({display:getComputedStyle(el).display,visible:el.checkVisibility()})));
    const top=await capture(page.locator('.reference-metrics')),a=await capture(price);
    await price.locator('.tile-open').click();await page.locator('dialog .evidence-layout').waitFor();await expect(page.locator('dialog .drawer-numbers')).toContainText('Share price',{useInnerText:true});const b=await capture(page.locator('dialog'));
    record.price={pass:false,top,tile:a,drawer:b};
    const row=rows[id],quote=prices[id];
    if(row.v&&quote){
      const money=(value:number)=>sharePrice(value,row.cur);
      record.drawerPriceNumbers=b.stats;
      expect(b.stats.map(x=>x[0])).toEqual(['Share price','Estimated value','Buy price','Expected / yr','Required','Safety discount','Price / value']);
      expect(b.stats[0][1]).toContain(money(quote[0]));
      expect(b.stats[1][1]).toContain(money(row.v[1]));
      expect(b.stats[2][1]).toContain(money(row.v[1]*(1-row.m)));
    }
    try{auditPriceSurfaces(ds[id],rows[id],prices[id]??null,top,a,b);record.price.pass=true;}catch(e){record.price.error=String(e);}
    await page.screenshot({path:out+'/'+id+'-'+width+'-price.png'});await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'detached'});
   }else{expect(Boolean(rows[id]?.b)).toBe(false);record.price={absent:true,buy:false};}
   expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   record.pass=record.tests.every((t:any)=>t.pass)&&(record.price.pass||record.price.absent);
   console.log(id,width,record.pass?'PASS':'strict semantic findings recorded');
  }catch(e){const r=results.find(r=>r.id===id&&r.width===width);if(r){r.pass=false;r.error=String(e);}else results.push({id,width,height,pass:false,error:String(e)});console.error(id,width,String(e));}finally{await page.close();}
 }
}finally{await browser.close();writeFileSync(out+'/semantics.json',JSON.stringify(results,null,2)+'\n');}
if(results.some(r=>!r.pass))throw Error('Browser gate failed');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
