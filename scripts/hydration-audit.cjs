const {chromium,webkit}=require('@playwright/test');
const sharp=require('sharp');const fs=require('fs');
// Usage: node scripts/hydration-audit.cjs PREVIEW_URL OUTPUT_DIR
// Supply VERCEL_OIDC_TOKEN through the environment for protected Previews.
const preview=process.argv[2],out=process.argv[3]||'.audit/hydrate/pixels';
if(!preview)throw Error('Provide the Preview URL');
fs.mkdirSync(out,{recursive:true});
const routes=['/','/value','/value?q=2018Q3','/s/AAPL','/s/KO','/HA?q=2026Q2','/BRK','/about','/newsletter','/value/method'];
(async()=>{const report=[];for(const [engineName,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch();
 for(const [width,height] of [[1728,970],[390,844]])for(const [i,route] of routes.entries()){
  const disk=fs.statfsSync('.');if(disk.bavail*disk.bsize<4*1024**3)throw Error('DISK STOP: less than 4 GiB free');
  const row={engine:engineName,width,height,deviceScaleFactor:2,route};
  for(const [name,base] of [['live','https://gigainvestors.com'],['preview',preview]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,reducedMotion:'reduce',extraHTTPHeaders:{'x-vercel-skip-toolbar':'1'}});
   if(name==='preview'&&process.env.VERCEL_OIDC_TOKEN)await context.route(new URL(base).origin+'/**',r=>r.continue({headers:{...r.request().headers(),'x-vercel-trusted-oidc-idp-token':process.env.VERCEL_OIDC_TOKEN}}));
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push({kind:'pageerror',text:e.message}));page.on('console',m=>{if(m.type()==='error')errors.push({kind:'console',text:m.text()})});
   const response=await page.goto(base+route,{waitUntil:'networkidle',timeout:60000});
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images).map(img=>img.decode().catch(()=>{})))});
   await page.waitForTimeout(1200);await page.mouse.move(0,0);
   const file=`${out}/${engineName}-${width}-${i}-${name}.png`;await page.screenshot({path:file,animations:'disabled'});
   row[name]={status:response.status(),errors,file,title:await page.title(),timelines:await page.locator('.house-timeline').count()};await context.close();
  }
  const a=await sharp(row.live.file).ensureAlpha().raw().toBuffer(),b=await sharp(row.preview.file).ensureAlpha().raw().toBuffer();let changed=0;for(let j=0;j<a.length;j+=4)if(a[j]!==b[j]||a[j+1]!==b[j+1]||a[j+2]!==b[j+2]||a[j+3]!==b[j+3])changed++;
  row.changedPixels=changed;report.push(row);fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({engine:engineName,width,route,changedPixels:changed,previewStatus:row.preview.status,previewErrors:row.preview.errors}));
 }
 await browser.close();
}if(report.some(r=>r.changedPixels||r.preview.errors.length||r.preview.status!==200))process.exitCode=1;})();
