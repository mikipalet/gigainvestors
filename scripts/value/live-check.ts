import {approvedIds,assertCoverage,critical,samplePages,type PageSample} from './publication-coverage';
import {companyPath} from '../../lib/company-route';
import {historyHeadline} from '../../lib/value/since-return';
import {chromium,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import type {HistoryIndex} from '../../lib/value/time-travel';

export async function checkTimeTravel(page:Page,history:HistoryIndex,url='https://gigainvestors.com/value',timeout=30_000):Promise<void>{
 const latest=history.quarters?.at(-1);
 if(!latest||!history.quarters?.includes('2018Q3'))throw new Error('Live check requires quarterly history including 2018Q3');
 page.setDefaultTimeout(timeout);
 const assert=expect.configure({timeout});
 const view=page.locator('.main-view'),slider=page.getByRole('slider',{name:'Quarter'});
 const frame=async(q:string)=>{
  await assert(view).toHaveAttribute('data-frame',q);
  await assert(view).toHaveAttribute('aria-busy','false');
  await assert(slider).toHaveAttribute('aria-valuetext',q.replace(/^(\d{4})Q(\d)$/,'$1 Q$2'));
  if(q!=='Today'){
   const summary=history.western?.perQuarter?.[q];
   const count=summary?.atBuy;
   if(count===undefined||!summary)throw new Error(`Missing Western quarter summary: ${q}`);
   await assert(page.locator('.index-story h1')).toHaveText(historyHeadline(q,summary));
   await assert(page.locator('.one-index')).toHaveAttribute('data-buy-count',String(count));
   // A manifest can render the header from history/index while failing to load rows.
   await assert(view).toHaveAttribute('data-buy-count',String(count));
  }
 };
 const open=async(suffix:string)=>{
  const response=await page.goto(`${url}${suffix}`,{waitUntil:'domcontentloaded',timeout:45_000});
  if(!response?.ok())throw new Error('Live page did not return success');
 };
 await open('');await frame('Today');
 await slider.press('ArrowLeft');await frame(latest);
 await assert(page).toHaveURL(new RegExp(`[?&]q=${latest}(?:&|$)`));
 await open('?q=2018Q3');await frame('2018Q3');
}
export async function checkLivePublication(repo:string,baseline?:string):Promise<void>{
 if(!baseline)critical('live page check requires previous archive');
 const coverage=assertCoverage(repo,baseline);
 const approvals=approvedIds(coverage.baseline,'pages'),logos=approvedIds(coverage.baseline,'logos');
 const current=new Map(coverage.after.pages.map(p=>[p.id,p]));
 const samples=samplePages(coverage.before).filter(p=>!approvals.has(p.id)).map(p=>({...p,logo:logos.has(p.id)?current.get(p.id)?.logo??null:current.get(p.id)?.logo||p.logo}));
 const history=JSON.parse(readFileSync(path.join(repo,'history/index.json'),'utf8')) as HistoryIndex;
 const browser=await chromium.launch({headless:true});
 try{const page=await browser.newPage({viewport:{width:1440,height:900}});await checkTimeTravel(page,history);await checkCompanyPages(page,samples);}
 finally{await browser.close();}
}

/** Every sampled page must render; existing approved logos must actually load. */
export async function checkCompanyPages(page:Page,samples:PageSample[],url='https://gigainvestors.com',timeout=30_000):Promise<void>{
 const failed:string[]=[];page.setDefaultTimeout(timeout);const assert=expect.configure({timeout});
 for(const sample of samples){
  try{
   const response=await page.goto(new URL(companyPath(sample.id),url).toString(),{waitUntil:'domcontentloaded',timeout});
   if(!response?.ok())throw Error('Company page failed');
   await assert(page.locator('main.company-page .company-heading h1')).toBeVisible();
   await assert(page.locator('main.company-page .one-dossier')).toBeVisible();
   if(sample.logo){
    const img=page.locator('main.company-page .company-heading .company-logo img');
    await assert(img).toBeVisible();
    await assert.poll(()=>img.evaluate((node:HTMLImageElement)=>node.complete&&node.naturalWidth>0)).toBe(true);
   }
  }catch{failed.push(sample.id);}
 }
 if(failed.length)critical(`pages failed; ids=${failed.join(',')}`);
 console.log(`coverage: pages=${samples.length}/${samples.length} live; logo img loaded`);
}
