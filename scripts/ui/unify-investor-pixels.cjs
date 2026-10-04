const {chromium}=require('playwright');const sharp=require('sharp');const fs=require('fs');const path=require('path');
const root=process.env.AUDIT_OUT||'/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/unify-1-evidence/investor-pixels';
(async()=>{fs.mkdirSync(root,{recursive:true});const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const result=[];
for(const [width,height]of [[1728,970],[2056,1180],[1440,800],[390,844]])for(const code of ['HA','BRK']){
 const buffers=[];
 for(const [label,base]of [['live','https://gigainvestors.com'],['local',process.env.AUDIT_URL||'http://localhost:3958']]){
  const p=await b.newPage({viewport:{width,height},reducedMotion:'reduce'});
  await p.goto(base+`/${code}?q=2026Q2`,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.addStyleTag({content:'nextjs-portal{display:none!important}'});await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));await p.mouse.move(0,0);await p.waitForTimeout(1000);
  const buffer=await p.screenshot({clip:{x:0,y:0,width,height:height-(width<640?84:48)}});fs.writeFileSync(path.join(root,`${code}-${width}-${label}.png`),buffer);buffers.push(await sharp(buffer).removeAlpha().raw().toBuffer());await p.close();
 }
 let changed=0,max=0;for(let i=0;i<buffers[0].length;i+=3){let d=0;for(let c=0;c<3;c++)d=Math.max(d,Math.abs(buffers[0][i+c]-buffers[1][i+c]));if(d)changed++;max=Math.max(max,d);}
 const row={code,width,height,changedPixels:changed,totalPixels:buffers[0].length/3,maxChannelDifference:max};result.push(row);console.log(JSON.stringify(row));
}
fs.writeFileSync(path.join(root,'comparison.json'),JSON.stringify(result,null,2));await b.close();})();
