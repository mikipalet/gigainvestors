import {test,expect} from '@playwright/test';
test.setTimeout(120000);
test.skip(process.env.VALUE_VIZ_LAB!=='1','Requires release-3 staging.');
for(const [width,height] of [[1728,970],[2056,1180],[390,844]])for(const [path,buys] of [['/',1],['/?markets=all',14],['/?year=2018',9]] as const){
 test(`main ${path} ${width}×${height}`,async({page})=>{
  await page.setViewportSize({width,height});await page.goto(path,{waitUntil:'networkidle'});
  await expect(page.locator('[data-viz=m]')).toBeVisible();await expect(page.locator('.main-buy-row')).toHaveCount(buys);
  expect(await page.locator('.main-buy-row').evaluateAll(nodes=>{const values=nodes.map(n=>Number((n as HTMLElement).dataset.return));return values.every((v,i)=>i===0||values[i-1]>=v);})).toBe(true);
  await expect(page.getByRole('navigation',{name:'Visualization'})).toHaveCount(0);
  await expect(page.locator('.main-view .company-monogram')).toHaveCount(0);
  expect(await page.locator('.main-company[data-priority=true]').count()).toBeLessThanOrEqual(1);
  if(width===390)await expect(page.locator('.main-next-row')).toHaveCount(5);
  const issues=await page.evaluate(()=>{
   const problems:string[]=[];
   if(document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth)problems.push('page overflow');
   for(const el of document.querySelectorAll('.main-company,.main-rest,.main-more')){const r=el.getBoundingClientRect();if(r.bottom>document.querySelector('.time-note')!.getBoundingClientRect().top||r.left<0||r.right>innerWidth)problems.push(el.textContent??'bounds');}
   for(const el of document.querySelectorAll('.main-name')){const r=el.getBoundingClientRect();const style=getComputedStyle(el);if(r.height>parseFloat(style.lineHeight)*2+1)problems.push('name exceeds two lines: '+el.textContent);if(el.textContent?.includes('&amp;'))problems.push('entity');}
   return problems;
  });expect(issues).toEqual([]);
  const ratios=await page.locator('.main-next-row').evaluateAll(nodes=>nodes.map(n=>Number((n as HTMLElement).dataset.ratio)));expect(ratios).toEqual([...ratios].sort((a,b)=>a-b));
  if(path.includes('2018')){await expect(page.locator('.main-zone-heading').first()).toContainText('Gain since then');expect(ratios.every(n=>n>0)).toBe(true);}
 });
}
test('pointer, keyboard, full lists, market filter, history and dossier',async({page})=>{
 await page.goto('/',{waitUntil:'networkidle'});
 const pick=page.locator('.main-buy-row').first();await pick.focus();await expect(page.getByRole('tooltip')).toContainText('Buy price');await expect(page.getByRole('tooltip')).toContainText('Expected return/yr');await page.keyboard.press('Escape');await expect(page.getByRole('tooltip')).toHaveCount(0);
 await pick.hover();const tip=await page.getByRole('tooltip').boundingBox(),box=await pick.boundingBox();expect(Math.abs(tip!.x-(box!.x+box!.width/2))).toBeLessThan(300);
 await pick.click();await expect(page.locator('.one-dossier')).toBeVisible();
 await page.goto('/',{waitUntil:'networkidle'});
 await page.getByRole('switch',{name:'Show all markets'}).click();await expect(page.locator('.main-buy-row')).toHaveCount(14);
 await page.getByRole('button',{name:/^\+\d+ more/}).click();let panel=page.getByRole('dialog');await expect(panel).toContainText('Next closest');const near=await panel.locator('.main-list-row').evaluateAll(nodes=>nodes.map(n=>Number((n as HTMLElement).dataset.ratio)));expect(near.every(n=>n<=1.5&&n>0)).toBe(true);await page.keyboard.press('Escape');
 await page.locator('[data-band=middle] .main-band-title').click();panel=page.getByRole('dialog');const middle=await panel.locator('.main-list-row').evaluateAll(nodes=>nodes.map(n=>Number((n as HTMLElement).dataset.ratio)));expect(middle.every(n=>n>1.5&&n<=3)).toBe(true);await page.keyboard.press('Escape');
 await page.locator('[data-band=far] .main-band-title').click();panel=page.getByRole('dialog');expect(await panel.locator('.main-list-row').evaluateAll(nodes=>nodes.every(n=>Number((n as HTMLElement).dataset.ratio)>3))).toBe(true);await page.keyboard.press('Escape');
 await page.getByRole('button',{name:/without a price/}).click();await expect(page.getByRole('dialog')).toContainText('Price unavailable');await page.keyboard.press('Escape');
 await page.goto('/?year=2018',{waitUntil:'networkidle'});await page.locator('.main-next-row').first().focus();await expect(page.getByRole('tooltip')).toContainText('Price in 2018');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Next year',exact:true}).click();await expect(page.locator('.index-story h1')).toContainText('2019');
 await page.goto('/?q=Microsoft',{waitUntil:'networkidle'});await expect(page.locator('.main-no-buys')).toBeVisible();await expect(page.locator('.main-empty-buy')).toContainText('No picks');
 for(const viz of ['z','a','b','c','d']){await page.goto(`/?viz=${viz}`,{waitUntil:'networkidle'});await expect(page.locator(`[data-viz=${viz}]`)).toBeVisible();}
});

test('method and dossier avoid internal verification wording',async({page})=>{
 await page.goto('/',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'About the method ↗',exact:true}).click();
 await expect(page.getByRole('dialog')).not.toContainText(/verif(?:y|ied|ication)|Needs review/i);
 await page.goto('/method',{waitUntil:'networkidle'});
 await expect(page.locator('main')).not.toContainText(/verif(?:y|ied|ication)|Needs review/i);
 await page.goto('/infy.us',{waitUntil:'networkidle'});
 await expect(page.getByTestId('verdict')).not.toContainText(/verif(?:y|ied|ication)|Needs review/i);
 await page.getByTestId('tile-price').click();
 await expect(page.getByRole('dialog')).not.toContainText(/verif(?:y|ied|ication)|Needs review/i);
});

test('full-list tooltips stay above the modal panel',async({page})=>{
 await page.goto('/',{waitUntil:'networkidle'});
 await page.locator('[data-band=middle] .main-band-title').click();
 await page.getByRole('dialog').locator('.main-list-row').first().focus();
 await expect(page.getByRole('dialog').getByRole('tooltip')).toContainText('Buy price');
});
