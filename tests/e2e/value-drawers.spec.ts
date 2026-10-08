import {test,expect} from '@playwright/test';
import {audit} from '../../scripts/value/design-audit.mjs';
import {shardOf} from '../../lib/value/shard';
import type {Dossier} from '../../lib/value/types';
test.skip(process.env.VALUE_DRAWERS!=='1','Requires the local live-data drawer server.');
for(const [width,height] of [[1728,970],[1440,800],[2056,1180],[390,844]])for(const path of ['/wkl.as','/jpm.us','/cbg.lse','/race.mi']){
 test(`${path} evidence fits ${width}x${height}`,async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width,height});await page.goto(path,{waitUntil:'networkidle'});
  for(const open of await page.locator('.tile-open').all()){
   await open.click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await page.waitForTimeout(280);
   await expect(dialog.getByRole('tab')).toHaveCount(0);await expect(dialog.getByRole('heading',{name:'Year by year',exact:false})).toBeVisible();await expect(dialog.getByRole('heading',{name:'From the filing'})).toBeAttached();
   await expect(dialog.locator('.filing-quotes blockquote')).not.toHaveCount(0);
   const chart=dialog.locator('.chart-hit-area').first();if(await chart.count()){await chart.focus();await chart.press('End');await expect(dialog.getByRole('tooltip')).toBeVisible();await chart.evaluate(el=>(el as HTMLElement).blur());await page.mouse.move(0,0);}else{await expect(dialog.locator('.drawer-years tbody tr').first()).toBeVisible();}
   expect((await page.evaluate(audit)).issues).toEqual([]);
   const geometry=await dialog.evaluate(el=>{const content=el.querySelector('.panel-content')!,r=el.getBoundingClientRect();let bottom=0;for(const child of el.querySelectorAll('*')){if(child.children.length||!child.checkVisibility())continue;const b=child.getBoundingClientRect();if(b.width>2&&b.height>2)bottom=Math.max(bottom,b.bottom-r.top);}return {empty:100*(1-bottom/r.height),overflow:content.scrollHeight-content.clientHeight,width:r.width,height:r.height};});
   if(width>767){expect(geometry.empty).toBeLessThan(8);expect(geometry.overflow).toBeLessThanOrEqual(1);}else{expect(geometry.width).toBe(width);expect(geometry.height).toBe(height);await dialog.locator('.panel-content').evaluate(el=>el.scrollTop=el.scrollHeight);await expect(dialog.locator('.filing-quotes a').first()).toBeInViewport();expect((await page.evaluate(audit)).issues).toEqual([]);}
   await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(open).toBeFocused();
  }
 });
}
test('negative retained earnings show signed window bars and the actual capital returned',async({page})=>{
 await page.goto('/wkl.as');await page.getByRole('button',{name:'Open Capital allocation evidence'}).click();
 const values=JSON.parse((await page.locator('dialog [data-window]').getAttribute('data-window'))!);expect(values.retained).toBeLessThan(0);await expect(page.locator('dialog .panel-answer')).toContainText('more than profits was returned to owners');await expect(page.locator('dialog .panel-answer')).toContainText('Market value rose');
 await expect(page.locator('dialog .mini-dollar svg rect')).toHaveCount(2);
 await expect(page.locator('dialog')).not.toContainText('≥ EUR -1.35B');
});

test('fitted company pages keep contiguous ranges and do not repeat companies',async({page})=>{
 await page.setViewportSize({width:1440,height:800});
 await page.goto('/',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'All companies ↗',exact:true}).click();
 const panel=page.getByRole('dialog'),pager=panel.getByRole('navigation',{name:'Company pages'});
 await panel.evaluate(async el=>{await document.fonts.ready;await Promise.all(el.getAnimations({subtree:true}).map(animation=>animation.finished));});
 const seen=new Set<string>();let previousEnd=0;
 for(let i=0;i<3;i++){
  await page.waitForLoadState('networkidle');
  await expect(pager.getByRole('button',{name:'→',exact:true})).toBeEnabled();
  await expect(pager).toContainText(new RegExp(`${previousEnd+1}–\\d+ of`));
  const range=(await pager.innerText()).match(/(\d+)–(\d+) of (\d+)/)!;
  const rows=panel.locator('[data-company-row]');
  await expect(rows).toHaveCount(Number(range[2])-Number(range[1])+1);
  for(const id of await rows.evaluateAll(elements=>elements.map(el=>el.getAttribute('data-company')!))){expect(seen.has(id)).toBe(false);seen.add(id);}
  expect((await page.evaluate(audit)).issues).toEqual([]);
  previousEnd=Number(range[2]);
  if(i<2)await pager.getByRole('button',{name:'→',exact:true}).click();
 }
});

for(const viewport of [{width:1728,height:970},{width:390,height:844}]){
 test(`disclosure pagination preserves every quoted word at ${viewport.width}`,async({page})=>{
  test.setTimeout(90000);await page.setViewportSize(viewport);
  const response=await page.request.get(`/api/value/data/dossiers/${shardOf('CBG.LSE')}.json`);
  expect(response.ok()).toBe(true);
  const dossier=(await response.json())['CBG.LSE'] as Dossier,thesis=dossier.thesis!;
  const evidence=[...thesis.evidence,...(thesis.guidance?[thesis.guidance.evidence]:[])];
  const unique=evidence.filter((item,i)=>evidence.findIndex(other=>other.url===item.url&&other.quote===item.quote)===i);
  const expected=unique.map(item=>item.quote.replace(/\s+/g,' ').trim()).join(' ');
  await page.goto('/cbg.lse',{waitUntil:'networkidle'});await page.locator('.thesis-source-button').click();
  const panel=page.getByRole('dialog'),next=panel.getByRole('button',{name:'Next detail page'}),parts:string[]=[];
  await expect(panel.locator('.thesis-evidence>p')).toBeVisible();
  await panel.evaluate(async el=>{await document.fonts.ready;await Promise.all(el.getAnimations({subtree:true}).map(animation=>animation.finished));});
  do{
   parts.push(await panel.locator('.thesis-evidence>p').innerText());
   expect((await page.evaluate(audit)).issues).toEqual([]);
   if(await next.isDisabled())break;
   await next.click();
  }while(parts.length<100);
  expect(parts.join(' ')).toBe(expected);
 });
}

test('a sparse quote window preserves earlier valuation estimates and their ranges',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const response=await page.request.get(`/api/value/data/dossiers/${shardOf('RIGD.LSE')}.json`);
 expect(response.ok()).toBe(true);
 const dossier=(await response.json())['RIGD.LSE'] as Dossier,history=dossier.valueHistory!;
 await page.goto('/reliance.nse',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Open valuation',exact:true}).click();
 const panel=page.getByRole('dialog'),chart=panel.locator('.mini-price');
 await expect(chart).toBeVisible();
 const segments=JSON.parse((await chart.getAttribute('data-values'))!) as Array<{from:number;low:number;mid:number;high:number}>;
 expect(segments.map(v=>Math.floor(v.from))).toEqual(history.map(v=>v[0]));
 for(const [fy,low,,high] of history){
  const row=panel.locator('.drawer-years tbody tr').filter({has:page.getByRole('rowheader',{name:`FY${fy}`,exact:true})});
  await expect(row.locator('.valuation-range')).toBeVisible();
  await expect(row.locator('.valuation-range')).toContainText(`${low.toFixed(2)}–${high.toFixed(2)}`);
 }
 const target=chart.locator('.chart-hit-area');await target.focus();await target.press('Home');
 await expect(panel.getByRole('tooltip')).toContainText(`FY${history[0][0]} · Estimated value`);
});
