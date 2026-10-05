const {chromium}=require('/Users/miki/GitHub/superinvestors-wt/value-logos/node_modules/@playwright/test');const fs=require('fs'),assert=require('assert');
const root=process.env.HOME+'/data/value-logos',out=root+'/evidence/screenshots';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true});const results=[];
for(const viewport of [{width:1728,height:970},{width:390,height:844}]){
 const size=viewport.width+'x'+viewport.height,p=await browser.newPage({viewport});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:3147/value',{waitUntil:'networkidle',timeout:120000});await p.getByRole('button',{name:/Matching companies/}).click();await p.waitForTimeout(1000);
 const list=await p.locator('.company-logo img').evaluateAll(a=>a.filter(x=>x.getBoundingClientRect().width&&x.getBoundingClientRect().top<innerHeight).map(x=>({src:x.src,loaded:x.complete&&x.naturalWidth>0})));assert(list.length>0);assert(list.every(x=>x.loaded));
 await p.screenshot({path:out+'/value-list-'+size+'.png'});results.push({route:'/value',view:'list',viewport,logos:list});
 await p.goto('http://127.0.0.1:3147/s/EWBC',{waitUntil:'networkidle',timeout:120000});const expected=JSON.parse(fs.readFileSync(root+'/bundle/records/EWBC.US.json')).logo;
 const ewbc=p.locator(`.company-logo img[src="${expected}"]`).first();await ewbc.waitFor();assert(await ewbc.evaluate(x=>x.complete&&x.naturalWidth>0));await p.screenshot({path:out+'/EWBC-'+size+'.png'});results.push({route:'/s/EWBC',viewport,logo:expected});
 await p.getByRole('button',{name:/Search/}).first().click();const input=p.getByRole('combobox');
 for(const ticker of ['EWBC','RBLX','ZM','BIDU','ATRO','NVT','ENTG','LPLA','CPNG','HUBS']){
  await input.fill(ticker);const result=p.locator(`[data-company="${ticker}"]`);await result.waitFor();const src=JSON.parse(fs.readFileSync(root+'/bundle/records/'+ticker+'.US.json')).logo;
  const img=result.locator('img');await img.waitFor();await p.waitForFunction(s=>{const i=document.querySelector(s);return i&&i.complete&&i.naturalWidth>0},`[data-company="${ticker}"] img`);assert.equal(await img.getAttribute('src'),src);
  await p.screenshot({path:out+'/search-'+ticker+'-'+size+'.png'});results.push({route:'/s/EWBC',search:ticker,viewport,logo:src,loaded:true});
 }
 results.push({viewport,pageErrors:errors});assert.deepEqual(errors,[]);await p.close();
}
fs.writeFileSync(root+'/evidence/browser-results.json',JSON.stringify(results,null,2));console.log('PASS: 24 screenshots, 20 search-logo assertions, EWBC and list at both sizes');await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
