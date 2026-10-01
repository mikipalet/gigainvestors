import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {audit} from './design-audit.mjs';
const base=process.argv[2]??'http://localhost:3013',out=process.argv[3]??'./test-results/design-flows';
mkdirSync(out,{recursive:true});
const b=await chromium.launch(),report=[];
const measure=()=>{
 const visible=e=>e.checkVisibility({opacityProperty:true,visibilityProperty:true})&&e.getBoundingClientRect().width>0;
 const dialog=document.querySelector('dialog[open],.search-modal'),root=dialog??document.body;
 const scrollers=[...root.querySelectorAll('*')].filter(e=>{const s=getComputedStyle(e);return visible(e)&&/(auto|scroll)/.test(s.overflowY)&&e.scrollHeight>e.clientHeight+2&&e.clientHeight>50}).map(e=>`${e.tagName}.${e.className} ${e.clientHeight}/${e.scrollHeight}`);
 const small=[...root.querySelectorAll('*')].filter(e=>!e.children.length&&e.textContent.trim()&&visible(e)&&parseFloat(getComputedStyle(e).fontSize)<14).map(e=>`${getComputedStyle(e).fontSize} ${e.textContent.trim().slice(0,70)}`);
 let textNodes=0;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(w.nextNode()){const t=w.currentNode,e=t.parentElement;if(!t.textContent.trim()||!e||!visible(e)||e.closest('.sr-only,script,style'))continue;const r=document.createRange();r.selectNodeContents(t);if([...r.getClientRects()].some(b=>b.width>0&&b.height>0&&b.top<innerHeight&&b.bottom>0&&b.left<innerWidth&&b.right>0))textNodes++;}
 return {scrollers,small,textNodes};
};
for(const [w,h]of(process.env.FLOW_VIEWPORTS??'1728x970,2056x1180,390x844').split(',').map(v=>v.split('x').map(Number))){
 const p=await b.newPage({viewport:{width:w,height:h}}),errors=[];
 p.on('pageerror',e=>errors.push(String(e)));
 const shot=async name=>{await p.waitForTimeout(120);const path=`${out}/${w}-${name}.png`;await p.screenshot({path});const item={viewport:`${w}x${h}`,name,path,focus:await p.evaluate(()=>{const el=document.querySelector('dialog[open],.search-modal');if(!el)return null;const {x,y,width,height}=el.getBoundingClientRect();return {x,y,width,height};}),...await p.evaluate(audit),...await p.evaluate(measure),errors:[...errors]};if(!name.startsWith('method')){const text=await p.evaluate(()=>document.body.innerText+' '+[...document.querySelectorAll('[title],[aria-label]')].map(e=>(e.getAttribute('title')??'')+' '+(e.getAttribute('aria-label')??'')).join(' '));const gap=text.match(/not enough (?:evidence|data)|not reported|unavailable|\bunclear\b|not tested|cannot judge/i);if(gap)item.issues.push(`Forbidden gap wording: ${gap[0]}`);}report.push(item);console.log(`${w} ${name}: ${item.issues.length} overlaps/clips, ${item.scrollers.length} scrollers, ${item.small.length} small, ${item.textNodes} texts`);};
 const go=async path=>{await p.goto(base+path,{waitUntil:'networkidle'});};
 const close=async()=>{const x=p.getByRole('button',{name:'Close panel'});if(await x.count())await x.click();else await p.keyboard.press('Escape');};
 const tabs=async prefix=>{const names=await p.getByRole('tab').allTextContents();for(const name of names){await p.getByRole('tab',{name,exact:true}).click();await shot(prefix+'-'+name.toLowerCase().replaceAll(' ','-'));const next=p.getByRole('button',{name:'Next detail page'});if(await next.count()){await next.click();await shot(prefix+'-'+name.toLowerCase()+'-page2');}const series=p.locator('.data-series select');if(await series.count()&&await series.locator('option').count()>1){await series.selectOption({index:1});await shot(prefix+'-data-series2');}}};
 for(const route of (process.argv[4]??'/,/?markets=all,/?year=2018').split(',')){await go(route);await shot('route-'+route.replace(/[^a-z0-9]+/gi,'_'));}
 await go('/');await shot('home');
 await p.locator('[data-testid=company-tile]').first().hover();await shot('home-tooltip');await p.locator('.main-next-row').first().hover();await shot('waiting-tooltip');await p.mouse.move(0,0);
 await p.getByRole('button',{name:'Method',exact:true}).click();await tabs('method');await close();
 if(w<768)await p.getByRole('button',{name:'Filters',exact:true}).click();
 await p.getByRole('combobox',{name:'Country',exact:true}).click();await shot('countries');const countryPages=p.getByRole('navigation',{name:'Country pages'});if(await countryPages.count()){await countryPages.getByRole('button').last().click();await shot('countries-page2');}await p.getByRole('combobox',{name:'Search Country',exact:true}).fill('ger');await shot('countries-search');await p.getByRole('option').filter({hasText:'Germany'}).click();
 if(w<768)await p.locator('.filter-apply').click();await shot('country-selected');await go('/');
 if(w<768)await p.getByRole('button',{name:'Filters',exact:true}).click();
 await p.getByRole('combobox',{name:'Sector',exact:true}).click();await p.getByRole('combobox',{name:'Search Sector',exact:true}).fill('tech');await shot('sector-search');await p.getByRole('option').first().click();
 if(w<768)await p.locator('.filter-apply').click();await shot('sector-selected');await go('/');
 await p.getByRole('switch').filter({hasText:'Western markets'}).click();await p.waitForTimeout(600);await shot('all-markets');
 const more=p.locator('.main-buys .main-more');if(await more.count()){await more.click();await shot('buy-list');const next=p.getByRole('button',{name:'Next detail page'});while(await next.count()&&!await next.isDisabled()){await next.click();await shot('buy-list-'+(await p.locator('.paged-items nav span').textContent()).replaceAll(' / ','-'));}await close();}
 if(w<768)await p.getByRole('button',{name:'Filters',exact:true}).click();await p.getByRole('switch',{name:'Near misses',exact:true}).click();if(w<768)await p.locator('.filter-apply').click();await shot('near-misses');
 if(w<768)await p.getByRole('button',{name:'Filters',exact:true}).click();await p.getByRole('switch',{name:'Held by superinvestors',exact:true}).click();if(w<768)await p.locator('.filter-apply').click();await shot('held-filter');
 await p.getByRole('button',{name:'All companies'}).click();await shot('company-list');await p.getByRole('navigation',{name:'Company pages'}).getByRole('button').last().click();await shot('company-list-page2');await close();
 await go('/');await p.getByRole('button',{name:'Search companies',exact:true}).click();await p.getByRole('combobox',{name:'Search investor, firm, ticker, company'}).fill('coca');await p.locator('#search-results [role=option]').first().waitFor();await shot('search-results');const searchPages=p.getByRole('navigation',{name:'Search pages'});if(await searchPages.count()){await searchPages.getByRole('button').last().click();await shot('search-page2');await searchPages.getByRole('button').first().click();}await p.locator('#search-results [role=option]').filter({hasText:'KO.US'}).first().click();await p.waitForLoadState('networkidle');await shot('search-result-open');
 for(const id of ['ko.us','race.mi','amb.war']){
  await go('/'+id);await shot(id);
  for(const key of ['understandable','moat','economics','management','accounting','price']){
   if(key==='price'&&!await p.getByTestId('tile-price').count())continue;
   await p.getByTestId('tile-'+key).click();await tabs(id+'-'+key);await close();
  }
  const inv=p.getByRole('button').filter({hasText:/tracked investors?/});if(await inv.count()){await inv.click();await shot(id+'-investors');const more=p.getByRole('button',{name:'Next detail page'});if(await more.count()){await more.click();await shot(id+'-investors-page2');}await close();}
 }
 for(const [id,keys]of[['cb.us',['economics','price']],['race.mi',['understandable']]]){await go('/'+id);await shot(id);for(const key of keys){await p.getByTestId('tile-'+key).click();await tabs(id+'-'+key);await close();}}
 await go('/');const slider=p.getByRole('slider',{name:'Fiscal year'});await slider.focus();await slider.press('Home');await p.waitForTimeout(700);await shot('time-first');
 const historicalTile=p.getByTestId('company-tile').first();if(await historicalTile.count()){await historicalTile.click();await p.waitForLoadState('networkidle');await shot('time-first-company');await p.goBack({waitUntil:'networkidle'});}
 const max=Number(await slider.getAttribute('max'));
 for(let i=1;i<=max;i++){await slider.press('ArrowRight');await p.waitForTimeout(200);if(i===max||i%5===0)await shot('time-key-'+i);}
 await slider.press('End');await shot('time-today');
 const box=await slider.boundingBox();await p.mouse.click(box.x+box.width*.2,box.y+box.height/2);await p.waitForTimeout(500);await shot('time-click');
 await p.mouse.move(box.x+box.width*.2,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x+box.width*.85,box.y+box.height/2,{steps:12});await p.mouse.up();await p.waitForTimeout(500);await shot('time-drag');
 await slider.press('End');await p.close();
 writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
}
await b.close();writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
const failures=report.filter(r=>r.issues.length||r.scrollers.length||r.small.length||r.errors.length);console.log(`${report.length} screens; ${failures.length} with issues`);if(failures.length)process.exitCode=1;
