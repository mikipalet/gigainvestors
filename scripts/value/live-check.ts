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
export async function checkLivePublication(repo:string):Promise<void>{
 const history=JSON.parse(readFileSync(path.join(repo,'history/index.json'),'utf8')) as HistoryIndex;
 const browser=await chromium.launch({headless:true});
 try{const page=await browser.newPage({viewport:{width:1440,height:900}});await checkTimeTravel(page,history);}
 finally{await browser.close();}
}
