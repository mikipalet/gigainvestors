import { test, expect } from '@playwright/test';
import { valueFixtures } from './value-fixtures';
export const sizes=[[390,844],[430,932],[820,1180],[1280,720],[1366,768],[1440,800],[1470,836],[1512,862],[1536,730],[1680,950],[1728,1000],[1920,960],[2560,1300]];
test.beforeEach(async({page})=>valueFixtures(page));
for (const [width,height] of sizes) {
 test(`one screen and evidence panels at ${width}x${height}`,async({page})=>{
  await page.setViewportSize({width,height});
  for(const [name,url] of [['index','/value'],['dossier','/value/ko.us'],['missing','/value/nope.us']]){
   await page.goto(url,{waitUntil:'networkidle'});
   if(name==='dossier')await expect(page.locator('.value-band')).toContainText('0.60×');
   if(name==='index')await expect(page.getByTestId('company-tile').first()).toBeVisible();
   await page.screenshot({path:`/tmp/value-design-7/${name}-${width}x${height}.png`});
   expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(height);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
   const cuts=await page.evaluate(()=>Array.from(document.querySelectorAll('.test-tile, .company-tile, .dossier-band, .index-story, .map-toolbar, .treemap-legend')).flatMap(parent=>{
    const box=parent.getBoundingClientRect();
    return Array.from(parent.children).flatMap(child=>{const r=child.getBoundingClientRect(),s=getComputedStyle(child);return s.display!=='none'&&r.width>0&&r.height>0&&(r.bottom>box.bottom+2||r.right>box.right+2||r.left<box.left-2||r.top<box.top-2)?[`${parent.className}: ${child.textContent?.slice(0,70)} exceeds parent`]:[];});
   }));
   expect(cuts).toEqual([]);
   const overlaps=await page.evaluate(()=>Array.from(document.querySelectorAll('.test-tile')).flatMap(tile=>{
    const children=Array.from(tile.children).filter(el=>getComputedStyle(el).display!=='none').map(el=>({text:el.textContent?.slice(0,35),r:el.getBoundingClientRect()})).filter(el=>el.r.width&&el.r.height);
    return children.flatMap((a,i)=>children.slice(i+1).flatMap(b=>Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left)>1&&Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top)>1?[`${a.text} overlaps ${b.text}`]:[]));
   }));
   expect(overlaps).toEqual([]);
   const compressedText=await page.evaluate(()=>Array.from(document.querySelectorAll('.test-tile > *, .company-tile > *')).filter(el=>getComputedStyle(el).display!=='none'&&el.scrollHeight>el.clientHeight+1).map(el=>el.textContent));
   expect(compressedText).toEqual([]);
  }
  await page.goto('/value/ko.us',{waitUntil:'networkidle'});
  for(let i=1;i<=6;i++){
   await page.keyboard.press(String(i));await expect(page.getByRole('dialog')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(height);
   await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  }
 });
}
