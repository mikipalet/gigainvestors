import {test,expect} from '@playwright/test';
test.setTimeout(120000);
test.skip(process.env.VALUE_VIZ_LAB!=='1','Requires release-3 local data server and build.');
for(const viz of ['a','b','c','d']){
 test(`${viz}: shared filters, timeline, focus, tooltip and dossier`,async({page})=>{
  await page.goto(`/?viz=${viz}`,{waitUntil:'networkidle'});
  await expect(page.locator('.viz-lab')).toHaveAttribute('data-total','212');
  const first=page.locator('.lab-company').first();await first.focus();await expect(page.getByRole('tooltip')).toBeVisible();
  const box=(await first.boundingBox())!;await first.hover();const tip=(await page.getByRole('tooltip').boundingBox())!;expect(Math.abs(tip.x-box.x)).toBeLessThan(300);await page.keyboard.press('Escape');await expect(page.getByRole('tooltip')).toHaveCount(0);
  const href=await first.getAttribute('href');await first.click();await expect(page).toHaveURL(new RegExp(href!.replaceAll('.','\\.')+'$'));await expect(page.locator('.one-dossier')).toBeVisible();
  await page.goto(`/?viz=${viz}`,{waitUntil:'networkidle'});
  await page.getByRole('switch',{name:'Show all markets'}).click();await expect(page.locator('.viz-lab')).toHaveAttribute('data-total','372');
  await page.getByRole('combobox',{name:'Country',exact:true}).click();const search=page.getByRole('combobox',{name:'Search Country',exact:true});await search.fill('Poland');await page.getByRole('option',{name:/Poland/}).click();await expect(page.locator('.viz-lab')).toHaveAttribute('data-total','9');
  await page.goto(`/?viz=${viz}&year=2018`,{waitUntil:'networkidle'});await expect(page.locator('.index-story h1')).toContainText('2018');await expect(page.locator('.lab-company').first()).toBeVisible();
  if(viz==='b')await expect(page.locator('[data-band="0"] .lab-company')).toHaveCount(9);
  if(viz==='d')await expect(page.locator('.lab-unavailable')).toContainText('Historical expected returns were not published');
  await page.getByRole('button',{name:'Next year',exact:true}).click();await expect(page.locator('.index-story h1')).toContainText('2019');
  if(viz==='a'||viz==='d'){
   await page.goto(`/?viz=${viz}`,{waitUntil:'networkidle'});await page.getByRole('combobox',{name:'Rows',exact:true}).click();await page.getByRole('option',{name:'Sector rows',exact:true}).click();await expect(page.locator('.lab-facet-label').first()).toBeVisible();
  }
 });
}
for(const [width,height] of [[1728,970],[2056,1180],[390,844]])test(`all prototypes stay within ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});
 for(const viz of ['a','b','c','d'])for(const extra of ['','&markets=all','&year=2018']){
  await page.goto(`/?viz=${viz}${extra}`,{waitUntil:'networkidle'});
  expect(await page.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight}))).toEqual({w:width,h:height});
  const issues=await page.locator('.lab-company').evaluateAll(nodes=>nodes.flatMap(n=>{const r=n.getBoundingClientRect();return r.bottom>innerHeight||r.right>innerWidth||r.left<0?[n.getAttribute('aria-label')]:[]}));expect(issues).toEqual([]);
  const priorities=await page.locator('.lab-company[data-priority=true]').count();expect(priorities).toBeLessThanOrEqual(1);
 }
});

test('view selection preserves market and year; every list page and missing-price company is reachable',async({page})=>{
 await page.goto('/?viz=a&markets=all&year=2018',{waitUntil:'networkidle'});
 await page.getByRole('navigation',{name:'Visualization'}).getByRole('button',{name:'Ranked list',exact:true}).click();
 await expect(page).toHaveURL(/markets=all/);await expect(page).toHaveURL(/year=2018/);await expect(page.locator('.lab-c')).toBeVisible();
 await page.setViewportSize({width:390,height:844});await page.goto('/?viz=c&markets=all',{waitUntil:'networkidle'});
 const seen=new Set<string>();
 while(true){for(const id of await page.locator('.lab-list-row').evaluateAll(n=>n.map(x=>x.getAttribute('data-company')!)))seen.add(id);
  const next=page.getByRole('button',{name:'Next ranked pages',exact:true});if(!await next.count()||await next.isDisabled())break;await next.click();
 }
 expect(seen.size).toBe(372);
 await page.goto('/?viz=a',{waitUntil:'networkidle'});await page.getByRole('button',{name:/7 need review/}).click();await expect(page.locator('.lab-missing-grid .lab-company')).toHaveCount(7);
 await page.goto('/?viz=b&markets=all&near=1',{waitUntil:'networkidle'});
 expect(await page.locator('.lab-company').evaluateAll(nodes=>nodes.some(n=>n.getBoundingClientRect().bottom>innerHeight))).toBe(false);
});
