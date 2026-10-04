import {describe,it,expect,vi} from 'vitest';
import {markdownRoute} from '@/lib/agents/routing';
import {checklistMarkdown} from '@/lib/agents/checklist';
import {investorMarkdown,stockMarkdown} from '@/lib/agent-content';
import {companyMarkdown} from '@/lib/agents/company';
import {sitemapIndex} from '@/lib/agents/sitemap';
import type {Dossier} from '@/lib/value/types';
import type {BrowserRow} from '@/lib/value/browser-view';

describe('Markdown representations',()=>{
 it.each([
  ['/BRK.md',false,'','/md/i/BRK'],['/s/KO.md',false,'','/md/s/KO'],
  ['/ko.us.md',true,'','/md/value/ko.us'],['/value/method',false,'text/markdown','/md/value/method'],
  ['/index.md',true,'','/md/value'],['/value/year/2011.md',false,'','/md/value/year/2011'],
  ['/value',false,'text/markdown','/md/value'],['/robots.txt',true,'text/markdown',null],['/mcp',false,'text/markdown',null],
 ])('maps %s independently of HTML routing', (path,host,accept,target)=>expect(markdownRoute(path,host,accept)).toBe(target));
 it('labels monetary holdings with USD and the actual quarter',()=>{
  const body=investorMarkdown({code:'TEST',person:'Investor',firm:'Firm',quarters:[{q:'2020Q1',total:1200000,positions:[{ticker:'KO',name:'Coca-Cola',shares:12,pct:100,value:1200000,activity:'hold',change:null}]}]},{});
  expect(body).toContain('USD 1,200,000');expect(body).toContain('2020Q1');
  expect(investorMarkdown({code:'EMPTY',person:'Empty',firm:'Firm',quarters:[]},{})).not.toContain('undefined');
 });
 it('keeps historical prices and returns separate from current prices',()=>{
  const row={id:'KO.US',n:'Coca-Cola',c:'US',w:'KO.US',t:'PPPPP',b:true,g:[],st:'s',cur:'USD',v:null,quote:null,h:1,k:'operating',mc:1,s:'Drinks',historicalPrice:{price:30,buyPrice:35,discount:.25},expected:.12,gain:.5,outcome:{date:'2026-10-03'}} as BrowserRow;
  const body=checklistMarkdown([row],null,'2018Q3');
  expect(body).toContain('2018-09-30');expect(body).toContain('USD 30');expect(body).toContain('12.0%');expect(body).toContain('50.0% to 2026-10-03');expect(body).toContain('survivorship');
 });
 it('preserves the published verdict and gives dated sources and missing-price behavior',()=>{
  const tests=Object.fromEntries(['understandable','moat','economics','management','accounting'].map(key=>[key,{key,result:'pass',numeric:'pass',reasons:['Published pass'],metrics:{},series:{},jev:[]}]));
  const d={id:'KO.US',company:{id:'KO.US',code:'KO',name:'Coca-Cola',country:'US',currency:'USD',kind:'operating',marketCapUsd:1},asOf:'2026-10-03',status:'scored',tests,valuation:null,holders:[],series:{},report:{url:'https://www.sec.gov/example',kind:'10-K',period:'2025-12-31',filed:'2026-02-01'},priceStory:{line:'Price story text',asOf:'2026-10-03',events:[],priceDate:'2026-10-02'},ownerMemo:{asOf:'2026-10-03',lines:[{question:1,answer:'Makes drinks.',evidence:[]}]}} as unknown as Dossier;
  const body=companyMarkdown(d,[62,'2026-10-02']);
  expect(body).toContain('USD 62 per share');expect(body).toContain('2026-10-02');expect(body).toContain('## Checklist');expect(body).toContain('## Holders');expect(body).toContain('Price story text');expect(body).toContain('Makes drinks.');expect(body).not.toContain('NaN');
  expect(companyMarkdown(d,null)).not.toContain('Share price:');
 });
 it('emits a sitemap index with same-origin child maps',()=>{
  const xml=sitemapIndex('value');expect(xml).toContain('<sitemapindex');expect(xml).toContain('https://gigainvestors.com/sitemaps/quarters.xml');expect(xml).not.toContain('<loc>http://');
 });
});

it('uses the stock page’s last-held default, while explicit empty quarters stay empty',()=>{
 const stock={ticker:'OLD',name:'Former holding',quarters:[{q:'2020 Q1',price:10,holders:[{code:'BRK',value:100,pct:1,activity:'hold' as const,change:null}]},{q:'2020 Q2',price:11,holders:[]}]};
 expect(stockMarkdown(stock,{BRK:'Buffett'})).toContain('Held by 1 investor');
 expect(stockMarkdown(stock,{BRK:'Buffett'},'2020 Q2')).toContain('Held by 0 investors');
});
