vi.mock('@/lib/value/store',()=>({readStore:vi.fn(async()=>({'TSM.US':'2330.TW'}))}));
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

const cases = [
 ['/', '/value'], ['/?q=2018Q3','/value?q=2018Q3'],
 ['/aapl.us','/s/AAPL'], ['/aapl.us?q=2018Q3','/s/AAPL?q=2018Q3'],
 ['/PLX.PA?markets=all','/s/PLX.PA?markets=all'], ['/7203.jp','/s/7203.JP'],
 ['/ko.us','/s/KO'], ['/googl.us','/s/GOOGL'], ['/adbe.us','/s/ADBE'],
 ['/jpm.us','/s/JPM'], ['/lulu.us','/s/LULU'], ['/wkl.as','/s/WKL.AS'],
 ['/brk-b.us','/s/BRK-B'], ['/m%26m.nse','/s/M%26M.NSE'],
 ['/method','/value/method'], ['/forward','/value/forward'],
 ['/sitemap.xml','/sitemap.xml'], ['/robots.txt','/robots.txt'],
 ['/value/aapl.us?q=2011Q4&markets=all','/s/AAPL?q=2011Q4&markets=all'],
 ['/value?q=2018Q3','/value?q=2018Q3'],
];
describe('one-site permanent redirects',()=>{
 it.each(cases)('%s → %s',async(path,target)=>{
  const r=await proxy(new NextRequest(`https://value.gigainvestors.com${path}`));
  expect(r.status).toBe(308);expect(r.headers.get('location')).toBe(`https://gigainvestors.com${target}`);
 });
 it.each(['/','/value','/BRK','/s/AAPL','/s/PLX.PA'])('keeps main %s',async path=>{
  expect((await proxy(new NextRequest(`https://gigainvestors.com${path}`))).headers.get('x-middleware-next')).toBe('1');
 });
 it('normalizes old local dossier URLs without leaving the preview',async()=>{
  expect((await proxy(new NextRequest('http://localhost:3017/value/aapl.us?q=2018Q3'))).headers.get('location')).toBe('http://localhost:3017/s/AAPL?q=2018Q3');
 });
 it('keys cached historical checklist HTML by quarter while retaining filters',async()=>{
  for(const query of ['q=2018Q3&country=DE','year=2018&country=DE']){
   const response=await proxy(new NextRequest('https://gigainvestors.com/value?'+query));
   const target=new URL(response.headers.get('x-middleware-rewrite')!);
   expect(target.pathname).toBe('/value/quarter/'+(query.startsWith('q=')?'2018Q3':'2018Q4'));
   expect(target.searchParams.get('country')).toBe('DE');
  }
  expect((await proxy(new NextRequest('https://gigainvestors.com/value?q=invalid'))).headers.get('x-middleware-next')).toBe('1');
 });
});

it.each([['/aapl.us.md?q=2018Q3','/s/AAPL.md?q=2018Q3'],['/index.md','/value.md'],['/tsm.us','/s/2330.TW']])('redirects legacy representation %s',async(path,target)=>{expect((await proxy(new NextRequest('https://value.gigainvestors.com'+path))).headers.get('location')).toBe('https://gigainvestors.com'+target);});

it.each(['/s/TSM','/s/tsm.us','/s/TSM.md','/value/TSM.US'])('redirects listing aliases before streaming or markdown rewrite: %s',async path=>{
 const response=await proxy(new NextRequest(`https://gigainvestors.com${path}?q=2025Q4`));
 expect(response.status).toBe(308);
 expect(response.headers.get('location')).toBe(`https://gigainvestors.com/s/2330.TW${path.endsWith('.md')?'.md':''}?q=2025Q4`);
});

it.each(['/s/TSM','/value/TSM.US'])('keeps alias redirects ahead of Accept negotiation: %s',async path=>{
 const response=await proxy(new NextRequest(`https://gigainvestors.com${path}?q=2018Q3`,{headers:{accept:'text/markdown'}}));
 expect(response.status).toBe(308);
 expect(response.headers.get('location')).toBe('https://gigainvestors.com/s/2330.TW?q=2018Q3');
 expect(response.headers.get('x-middleware-rewrite')).toBeNull();
});
it('negotiates historical markdown before the HTML quarter cache rewrite',async()=>{
 const response=await proxy(new NextRequest('https://gigainvestors.com/value?q=2018Q3',{headers:{accept:'text/markdown'}}));
 expect(new URL(response.headers.get('x-middleware-rewrite')!).pathname).toBe('/md/value');
});
