import {chromium,type Browser} from '@playwright/test';
import {brandCandidates,robotsRequest,type BrandCandidate,type LogoAttempt} from './logo-discovery';
import {LOGO_USER_AGENT} from './logo-sources';
import {checkLogoDisk} from './logo-fetch';
import type {Company} from './types';
let browser:Promise<Browser>|undefined;
const slots=[Promise.resolve(),Promise.resolve()];let next=0;
/** Optional browser pass for public JS-rendered headers; every request obeys robots and byte limits. */
export async function browserBrands(company:Company,sites:string[],request:typeof fetch,attempts:LogoAttempt[]):Promise<BrandCandidate[]>{
 const slot=next++%slots.length;const previous=slots[slot];let release!:()=>void;slots[slot]=new Promise<void>(r=>{release=r;});await previous;
 try{
  checkLogoDisk();browser??=chromium.launch({headless:true});const instance=await browser;
  const context=await instance.newContext({userAgent:LOGO_USER_AGENT,viewport:{width:1280,height:800},serviceWorkers:'block'});
  const guarded=robotsRequest(request,attempts);const result:BrandCandidate[]=[];
  try{
   await context.route('**/*',async route=>{
    const r=route.request();
    if(!['GET','HEAD'].includes(r.method())||!/^https?:/.test(r.url())||['media','font'].includes(r.resourceType())){await route.abort();return;}
    try{const response=await guarded(r.url(),{headers:r.headers()});const headers=Object.fromEntries(response.headers);delete headers['content-encoding'];delete headers['content-length'];delete headers['transfer-encoding'];await route.fulfill({status:response.status,headers,body:Buffer.from(await response.arrayBuffer())});}catch{await route.abort().catch(()=>{});}
   });
   const page=await context.newPage();
   for(const site of [...new Set(sites)].slice(0,2))try{
    await page.goto(site,{waitUntil:'domcontentloaded',timeout:25000});await page.waitForLoadState('networkidle',{timeout:2500}).catch(()=>{});
    const html=await page.content();const candidates=brandCandidates(html,page.url(),[company.name,company.nativeName,company.nameLocal].filter(Boolean).join(' '));
    const backgrounds=await page.evaluate(()=>Array.from(document.querySelectorAll('header [class*="logo"],nav [class*="logo"],[class*="header"] [class*="logo"]')).filter(el=>!el.closest('[class*="partner"],[class*="social"]')).flatMap(el=>[getComputedStyle(el),getComputedStyle(el,'::before'),getComputedStyle(el,'::after')].flatMap(s=>[...s.backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(m=>m[1]))));
    result.push(...candidates.map(c=>({...c,source:'official-browser'})),...backgrounds.map(url=>({url,page:page.url(),source:'official-browser'})));
    attempts.push({source:'official-browser',url:site,outcome:`${candidates.length+backgrounds.length} rendered header candidates`});
    if(result.length)break;
   }catch(e){attempts.push({source:'official-browser',url:site,outcome:String(e).slice(0,220)});}
   return [...new Map(result.map(c=>[c.url,c])).values()];
  }finally{await context.close();}
 }catch(e){attempts.push({source:'official-browser',outcome:String(e).slice(0,220)});return [];}
 finally{release();}
}
export async function closeLogoBrowser(){const current=browser;browser=undefined;if(current)await current.then(b=>b.close()).catch(()=>{});}
