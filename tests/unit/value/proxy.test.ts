import { describe, expect, it } from 'vitest';
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
});
