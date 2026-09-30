import {test,expect} from '@playwright/test';
import {audit} from '../../scripts/value/design-audit.mjs';
test.skip(process.env.VALUE_VIZ_LAB!=='3','Local index-universe visualization lab.');
test.setTimeout(90000);
for(const viz of ['s','b','a','k'])for(const suffix of ['','&markets=all','&year=2018'])for(const [width,height] of [[1728,970],[2056,1180],[390,844]]){
 test(`${viz}${suffix} fits ${width}x${height}`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height});await page.goto(`/?viz=${viz}${suffix}`);
  const view=page.locator('.lab-three');await expect(view).toHaveAttribute('data-variant',viz);
  await expect(view).toHaveAttribute('data-frame',suffix.includes('2018')?'2018':'Today');
  if(viz==='a'||viz==='k')await expect(view).toHaveAttribute('data-history','ready');
  await page.waitForTimeout(450);
  const fit=await view.evaluate(el=>{
   const parent=el.getBoundingClientRect();
   const outside=[...el.querySelectorAll('[data-company],.lab-more')].filter(e=>{const r=e.getBoundingClientRect();return r.bottom>parent.bottom+2||r.top<parent.top-1||r.right>innerWidth+1||r.left<0;}).map(e=>e.textContent);
   return {outside,scroll:document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth};
  });
  expect(fit).toEqual({outside:[],scroll:true});expect(errors).toEqual([]);expect((await page.evaluate(audit)).issues).toEqual([]);
  if(viz==='a')expect(await view.evaluate(el=>{
   const labels=[...el.querySelectorAll('.arrivals-canvas svg text')].map(e=>e.getBoundingClientRect());
   const logos=[...el.querySelectorAll('.arrival-start .company-logo')].map(e=>e.getBoundingClientRect());
   return labels.some(a=>logos.some(b=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top));
  })).toBe(false);
  await expect(page.getByRole('slider',{name:'Fiscal year'})).toBeVisible();
 });
}
for(const viz of ['s','b','a','k'])test(`${viz} time travel, fast scrubbing, hover and complete lists`,async({page})=>{
 await page.goto(`/?viz=${viz}&year=2018`);const view=page.locator('.lab-three');await expect(view).toHaveAttribute('data-frame','2018');
 if(viz==='a'||viz==='k')await expect(view).toHaveAttribute('data-history','ready');
 await page.locator('.lab-mark').first().focus();await expect(page.getByRole('tooltip')).toContainText('Buy below');await page.keyboard.press('Escape');await expect(page.getByRole('tooltip')).toHaveCount(0);
 await page.locator('.lab-more').last().click();await expect(page.getByRole('dialog')).toBeVisible();await page.locator('dialog .lab-list-row').first().focus();await expect(page.getByRole('dialog').getByRole('tooltip')).toBeVisible();await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 const slider=page.getByRole('slider',{name:'Fiscal year'});await slider.press('ArrowRight');await expect(view).toHaveAttribute('data-frame','2019');
 const durations=await view.evaluate(el=>el.getAnimations({subtree:true}).map(a=>Number(a.effect?.getTiming().duration)));expect(durations.every(d=>d<=400)).toBe(true);
 // Keep the input interval inside one browser turn: runner latency must not
 // turn the intended fast scrub into two legitimate slow steps.
 const rapid=await slider.evaluate(async el=>{
  const input=el as HTMLInputElement,current=Number(input.value);
  const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;
  for(const value of [current+1,current]){set.call(input,String(value));input.dispatchEvent(new Event('input',{bubbles:true}));}
  await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
  const root=document.querySelector('.lab-three') as HTMLElement;
  return {fast:root.dataset.fast,animations:root.getAnimations({subtree:true}).length};
 });
 expect(rapid).toEqual({fast:'true',animations:0});
 await expect(view).toHaveAttribute('data-fast','false');
 await page.getByRole('button',{name:'Play time travel',exact:true}).click();await expect(page.getByRole('button',{name:'Pause time travel'})).toBeVisible();await expect(view).not.toHaveAttribute('data-frame','2019');await page.getByRole('button',{name:'Pause time travel'}).click();
 await expect(page).toHaveURL(new RegExp(`viz=${viz}`));
});
test('phone first tap identifies and second tap opens dossier',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});const page=await context.newPage();await page.goto(`${process.env.BASE_URL}/?viz=s`);
 const hero=page.locator('.shelf-hero');await hero.tap();await expect(page.getByRole('tooltip')).toContainText('Infosys');await expect(page).toHaveURL(/viz=s/);await hero.tap();await expect(page.locator('.one-dossier')).toBeVisible();await context.close();
});
