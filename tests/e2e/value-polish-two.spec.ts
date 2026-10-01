import {expect,test} from '@playwright/test';
test.skip(!process.env.VALUE_STORE_DIR,'Requires the complete local staging data.');
for(const [width,height] of [[1728,970],[390,844]]) {
 test(`filter counts predict the resulting view ${width}`,async({page})=>{
  await page.setViewportSize({width,height});
  await page.goto('/?near=1',{waitUntil:'networkidle'});
  const mobile=width<768;
  if(mobile)await page.getByRole('button',{name:'Filters',exact:true}).click();
  const open=async(label:string)=>{if(!mobile)await page.getByRole('combobox',{name:label,exact:true}).click();return page.getByRole('listbox',{name:mobile?(label==='Country'?'Countries':'Sectors'):label,exact:true});};
  const count=async(option:ReturnType<typeof page.locator>)=>Number((await option.locator('.option-count').innerText()).replaceAll(',',''));
  const country=await open('Country');
  await expect(page.locator('.main-view')).toHaveAttribute('aria-busy','false');
  expect(await count(country.getByRole('option').first())).toBe(Number(await page.locator('.main-view').getAttribute('data-total')));
  const us=country.getByRole('option').filter({hasText:'United States'}),usCount=await count(us);
  await us.click();await expect(page.locator('.main-view')).toHaveAttribute('data-total',String(usCount));
  const sectors=await open('Sector');
  expect(await count(sectors.getByRole('option').first())).toBe(usCount);
  const tech=sectors.getByRole('option').filter({hasText:'Technology'}),techCount=await count(tech);
  await tech.click();await expect(page.locator('.main-view')).toHaveAttribute('data-total',String(techCount));
  const countries=await open('Country'),allCount=await count(countries.getByRole('option').first());
  await countries.getByRole('option').first().click();await expect(page.locator('.main-view')).toHaveAttribute('data-total',String(allCount));
 });
 test(`pending and failed logos never occupy strip slots ${width}`,async({page})=>{
  await page.setViewportSize({width,height});
  let release!:()=>void;const pending=new Promise<void>(r=>release=r);
  await page.route('**/api/value/logo?*',async route=>{await pending;await route.fulfill({status:404,body:''});});
  await page.goto('/?country=US',{waitUntil:'domcontentloaded'});
  const strip=page.locator('.main-logo-strip');await expect(page.locator('.main-view')).toBeVisible();
  expect(await strip.locator('a').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().width>0).length)).toBe(0);
  release();await expect(strip.locator('a')).toHaveCount(0,{timeout:30000});
  await expect(page.locator('.main-company .company-monogram').first()).toBeVisible();
 });
}
for(const width of [1728,390])test(`failed strip logos refill from the next available companies ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:970});
 const failed=new Set<string>();
 await page.route('**/api/value/logo?*',route=>failed.has(route.request().url())?route.fulfill({status:404,body:''}):route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="25" fill="green"/></svg>'}));
 await page.goto('/?country=US',{waitUntil:'networkidle'});
 const logos=page.locator('.main-logo-strip a'),cap=width===390?4:8;
 await expect(logos).toHaveCount(cap);
 const before=await logos.evaluateAll(nodes=>nodes.map(n=>({id:(n as HTMLElement).dataset.company,src:n.querySelector('img')!.src})));
 before.forEach(n=>failed.add(n.src));
 await page.reload({waitUntil:'networkidle'});
 await expect(logos).toHaveCount(cap);
 await expect(logos.locator('img[data-loaded=true]')).toHaveCount(cap);
 const after=await logos.evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).dataset.company));
 expect(after.some(id=>before.some(n=>n.id===id))).toBe(false);
 await expect(page.locator('.company-logo-empty')).toHaveCount(0);
});
