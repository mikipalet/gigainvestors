import {chromium,expect,type Locator} from '@playwright/test';
import {readFileSync,readdirSync,writeFileSync,statfsSync} from 'node:fs';
import {homedir} from 'node:os';
import {auditTestSurfaces,type SurfaceSnapshot} from '../../lib/value/surface-audit';
import {checkTimeTravel} from '../../scripts/value/live-check';
const base='http://127.0.0.1:3048',store='.audit/understandable/redesigned-store';
const ds=Object.assign({},...readdirSync(store+'/dossiers').map(f=>JSON.parse(readFileSync(store+'/dossiers/'+f,'utf8'))));
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
const browser=await chromium.launch();const results:any[]=[];
try{
 for(const [width,height] of [[1728,970],[390,844]])for(const id of ['NFLX.US','FTNT.US','STRL.US','IDT.US','KOG.OL']){
  for(const path of ['/',homedir()+'/data']){const s=statfsSync(path);if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP: commit and stop');}
  const page=await browser.newPage({viewport:{width,height}}),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   const response=await page.goto(base+'/s/'+id.toLowerCase(),{waitUntil:'networkidle',timeout:90000});expect(response?.ok()).toBe(true);
   const tile=page.locator('[data-testid=tile-understandable]');await expect(tile).toHaveClass(/pass/);
   await expect(tile.locator('.tile-sentence')).toContainText('improved consistently with no loss years');
   const a=await capture(tile);await tile.locator('.tile-open').click();await page.locator('dialog .evidence-layout').waitFor();
   const b=await capture(page.locator('dialog'));auditTestSurfaces(ds[id],ds[id].tests.understandable,a,b);
   await expect(page.locator('dialog')).toContainText('Steady or improving');expect(errors).toEqual([]);
   results.push({id,width,height,pass:true,surfaces:{tile:a,drawer:b}});console.log(id,width,'PASS');
  }finally{await page.close();}
 }
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await checkTimeTravel(page,JSON.parse(readFileSync(store+'/history/index.json','utf8')),base+'/value',60000);
 results.push({liveCheckLocal:true,pass:true});await page.close();console.log('Unmodified live-check against local export PASS');
}finally{await browser.close();writeFileSync('research/understandable/outputs/browser-semantics.json',JSON.stringify(results,null,2)+'\n');}

}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
