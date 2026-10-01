import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { refreshPrices, publishedPriceCompanies } from '@/scripts/value/stages/prices';
import type { Company } from '@/lib/value/types';
const roots: string[] = [];
const root = () => { const r=mkdtempSync(path.join(tmpdir(),'resilient-prices-'));roots.push(r);return r; };
afterEach(()=>roots.splice(0).forEach(r=>rmSync(r,{recursive:true,force:true})));
const company=(id:string)=>({id,code:id.split('.')[0],exchange:id.split('.')[1],country:'US',source:'eodhd'}) as Company;
const now = Date.parse('2026-10-01T03:00:00Z');
it('recovers a recorded NSE bulk 404 with Yahoo and continues later exchanges',async()=>{
 const repo=root(); const recorded=JSON.parse(readFileSync('tests/fixtures/value/ops/eodhd-nse-404.json','utf8'));
 const result=await refreshPrices({repo,companies:[company('RELIANCE.NSE'),company('KO.US')],now,
 bulk:async exchange=>{if(exchange==='NSE')throw new Error(recorded.error);return [{code:'KO',close:70,date:'2026-09-30'}]},
 yahoo:async()=>[1400,'2026-09-30']});
 expect(JSON.parse(readFileSync(path.join(repo,'prices/US.json'),'utf8'))).toEqual({'RELIANCE.NSE':[1400,'2026-09-30'],'KO.US':[70,'2026-09-30']});
 expect(result).toMatchObject({total:2,fresh:2,yahoo:1,ok:true,exchangeFailures:[{exchange:'NSE',error:'EODHD HTTP 404'}]});
});
it.each([1,2])('persists successes and requires >=95 percent fresh closes (%s failed)',async failed=>{
 const repo=root();const companies=Array.from({length:20},(_,i)=>company(`C${i}.US`));
 const result=await refreshPrices({repo,companies,now,bulk:async()=>companies.slice(failed).map(c=>({code:c.code,close:10,date:'2026-09-30'})),yahoo:async()=>{throw new Error('unavailable')}});
 expect(result).toMatchObject({total:20,fresh:20-failed,ok:failed===1});
 expect(Object.keys(JSON.parse(readFileSync(path.join(repo,'prices/US.json'),'utf8')))).toHaveLength(20-failed);
});
it('does not count stale/future closes or older responses rejected by the price merge',async()=>{
 const repo=root();mkdirSync(path.join(repo,'prices'));writeFileSync(path.join(repo,'prices/US.json'),JSON.stringify({'OLD.US':[90,'2026-09-30']}));
 const result=await refreshPrices({repo,companies:['STALE.US','FUTURE.US','OLD.US'].map(company),now,
 bulk:async()=>[{code:'STALE',close:2,date:'2020-01-01'},{code:'FUTURE',close:3,date:'2027-01-01'},{code:'OLD',close:4,date:'2026-09-29'}],yahoo:async()=>{throw new Error('unavailable')}});
 expect(result.fresh).toBe(0);expect(result.ok).toBe(false);
 expect(JSON.parse(readFileSync(path.join(repo,'prices/US.json'),'utf8'))).toEqual({'OLD.US':[90,'2026-09-30']});
});
it('selects only published country-index identities and uses dossier metadata as fallback',()=>{
 const repo=root();mkdirSync(path.join(repo,'index'));mkdirSync(path.join(repo,'dossiers'));
 writeFileSync(path.join(repo,'index/US.json'),JSON.stringify([{id:'KO.US'}]));writeFileSync(path.join(repo,'index/default.json'),JSON.stringify([{id:'KO.US'}]));
 writeFileSync(path.join(repo,'dossiers/001.json'),JSON.stringify({'KO.US':{company:company('KO.US')}}));
 expect(publishedPriceCompanies(repo,[company('OTHER.US')]).map(c=>c.id)).toEqual(['KO.US']);
});
it('uses the last completed daily Yahoo close while the current session is trading',async()=>{
 const {parseYahooPrice}=await import('@/lib/value/prices-yahoo');
 const raw=JSON.parse(readFileSync('tests/fixtures/value/prices/yahoo-8058.json','utf8'));
 const chart=raw.chart.result[0];const regular=chart.meta.currentTradingPeriod.regular;
 expect(parseYahooPrice(raw,(regular.start+3600)*1000)).toEqual([4818,'2026-09-28']);
 expect(parseYahooPrice(raw,regular.end*1000)).toEqual([4637,'2026-09-29']);
});

it('refreshes the full member benchmark before its first snapshot, including unanalysed members',()=>{
 const repo=root();mkdirSync(path.join(repo,'index'));mkdirSync(path.join(repo,'dossiers'));
 writeFileSync(path.join(repo,'index/US.json'),'[]');
 expect(publishedPriceCompanies(repo,[{...company('MEMBER.US'),indexes:['S&P 500']},company('OUTSIDE.US')]).map(c=>c.id)).toEqual(['MEMBER.US']);
});
it('keeps refreshing archived identities after they leave the current index universe',async()=>{
 const {buildForwardSnapshot}=await import('@/lib/value/forward');
 const repo=root();mkdirSync(path.join(repo,'index'));mkdirSync(path.join(repo,'forward'));
 writeFileSync(path.join(repo,'index/US.json'),'[]');
 const c={...company('OLD.US'),name:'Former member',currency:'USD',listings:['OLD.US']};
 const snapshot=buildForwardSnapshot({date:'2026-10-01',universe:[c],rows:[],prices:{'OLD.US':[10,'2026-10-01']}});
 writeFileSync(path.join(repo,'forward/index.json'),JSON.stringify({dates:['2026-10-01']}));
 writeFileSync(path.join(repo,'forward/2026-10-01.json'),JSON.stringify(snapshot));
 expect(publishedPriceCompanies(repo,[])).toMatchObject([{id:'OLD.US',code:'OLD',exchange:'US',country:'US',currency:'USD'}]);
});
