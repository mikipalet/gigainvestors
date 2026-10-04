import { describe,it,expect,vi } from 'vitest';
import type { Dossier } from '@/lib/value/types';
import { projectDossier,projectHoldings } from '@/lib/agent-api/projections';
import { executeEndpoint,parseQuery } from '@/lib/agent-api/data';
import { ROUTES } from '@/lib/agent-api/config';
import { schemas } from '@/lib/agent-api/schemas';
const f=vi.hoisted(()=>{
 const test=(key:string)=>({key,result:'pass',numeric:'pass',reasons:['Computed reason'],metrics:{roicMedian:.2},series:{roic:[[2025,.2]],revenue:[[2025,999999]]},jev:[]});
 const dossier={id:'KO.US',asOf:'2026-10-01',status:'scored',company:{id:'KO.US',name:'Coca-Cola',code:'KO',exchange:'NYSE',country:'US',currency:'USD',sector:'Consumer',kind:'operating',marketCapUsd:100,description:'DO_NOT_EXPORT'},tests:Object.fromEntries(['understandable','moat','economics','management','accounting'].map(k=>[k,test(k)])),valuation:null,valuationReason:'No value',report:{url:null,filed:null,period:null},series:{revenue:[[2025,999999]],roic:[[2025,.2]]},priceHistory:[['2025-01',777777]],holders:[],versions:{pipeline:'1',questions:'1'},b:false,w:'KO.US',priceStory:{version:1,asOf:'2026-10-01',line:'Computed story',events:[],needs:null,facts:[{text:'sales +10%',url:'https://example.com',date:'2026-01-01',points:[[2025,999999]],label:'Sales',unit:'money'}],priceDate:null}};
 const row={id:'KO.US',n:'Coca-Cola',c:'US',s:'Consumer',k:'operating',mc:100,v:[40,50,60],cur:'USD',t:'PPPPP',g:[],h:2,st:'s',w:'KO.US',b:true,m:.25,quote:[30,'2026-10-01'],expected:.12};
 return {dossier,row,meta:{asOf:'2026-10-01',views:{current:'views/current.json',quarters:{'2020Q1':'views/2020Q1.json'},years:{}},tags:{},versions:{pipeline:'1',questions:'1'},counts:{universe:1,scored:1,insufficient:0}},investor:{code:'BRK',person:'Warren Buffett',firm:'Berkshire',quarters:[{q:'2020Q1',total:100,positions:[{ticker:'KO',name:'Coca-Cola',shares:555,value:70,pct:70,activity:'hold',change:null},{ticker:'AAPL',name:'Apple',shares:888,value:30,pct:30,activity:'new',change:null}]}]}};
});
vi.mock('@/lib/data',()=>({getIndex:async()=>({generatedAt:'2026-10-01',quarters:['2020Q1'],investors:[{code:'BRK',person:'Warren Buffett',firm:'Berkshire',series:[{q:'2020Q1',total:100,positions:2}]}]}),getInvestor:async()=>f.investor,getStock:async()=>({ticker:'KO',name:'Coca-Cola',quarters:[{q:'2020 Q1',holders:[{code:'BRK',value:70,pct:70,activity:'hold',change:null}]}]}),getSearchIndex:async()=>({investors:[{code:'BRK',person:'Warren Buffett',firm:'Berkshire'}],stocks:[]})}));
vi.mock('@/lib/value/store',()=>({getMeta:async()=>f.meta,getDefaultIndex:async()=>[f.row],enrichRows:async(x:unknown)=>x,getDossier:async()=>f.dossier,getPrice:async()=>[30,'2026-10-01'],getForwardRecord:async()=>({start:null,asOf:null,days:0,snapshots:0,all:{priceReturn:null,dividendReturn:null,benchmarkPriceReturn:null,benchmarkDividendReturn:null,missingIds:[]},western:{priceReturn:null,dividendReturn:null,benchmarkPriceReturn:null,benchmarkDividendReturn:null,missingIds:[]},picks:[]}),readStore:async(file:string)=>file==='search/manifest.json'?{split:[],maxPrefix:2}:file.startsWith('search/')?{rows:[['KO.US','Coca-Cola','US','a',100,'KO.US']],aliases:{ko:[0]}}:file==='history/index.json'?{quarters:['2020Q1'],years:[2020],perYear:{},perQuarter:{'2020Q1':{analysed:1,qualityPasses:1,atBuy:1,avgReturnAtBuy:.2,avgReturnQuality:.2,avgReturnAll:.2}},western:{perYear:{},perQuarter:{}}}:file.startsWith('views/')?{columns:Object.keys(f.row),rows:[Object.values(f.row)]}:null}));

describe('derived data boundary',()=>{
 it('omits vendor descriptions and raw price/fundamental series at all depths',()=>{const out=JSON.stringify(projectDossier(f.dossier as unknown as Dossier,[30,'2026-10-01']));expect(out).not.toContain('999999');expect(out).not.toContain('777777');expect(out).not.toContain('DO_NOT_EXPORT');expect(out).toContain('roic');expect(out).toContain('Computed story');});
 it('computes holdings rather than returning raw Dataroma tables',()=>{const out=projectHoldings(f.investor as never,'2020Q1');expect(out.positions[0].weight).toBe(.7);expect(out.concentration.topFiveWeight).toBe(1);expect(JSON.stringify(out)).not.toMatch(/"(?:shares|value|pct|total)":/);});
});
describe('endpoint contracts',()=>{
 for(const route of ROUTES)it(route.path+' satisfies its public schema',async()=>{
  const path='/api/v1'+route.path.replace('{id}',route.id==='holdings'?'BRK':'KO.US').replace('{quarter}','2020Q1');
  const q=parseQuery(new URLSearchParams(route.id==='search'?'q=KO':route.id==='holdings'?'quarter=2020Q1':''),route);
  const output=await executeEndpoint(route,path,q);
  expect(schemas[route.id].safeParse(output).success,JSON.stringify(output).slice(0,300)).toBe(true);
 });
 it('rejects unsupported filters, invalid quarters and excessive page sizes',()=>{expect(()=>parseQuery(new URLSearchParams('quarter=2020Q8'),ROUTES[2])).toThrow();expect(()=>parseQuery(new URLSearchParams('limit=10001'),ROUTES.find(r=>r.id==='export')!)).toThrow();expect(()=>parseQuery(new URLSearchParams('api_key=abc'),ROUTES[0])).toThrow();});
});

it('includes the stock ownership surface',()=>{expect(ROUTES.some(r=>r.id==='ownership' as string)).toBe(true);});
it('preserves the LTM period beside derived test observations',()=>{
 const d=structuredClone(f.dossier) as unknown as Dossier;
 d.tests.moat.provisional={fy:2026,end:'2026-06-30',label:'LTM to Jun 2026',filed:'2026-07-29',periods:['2025-09-30','2025-12-31','2026-03-31','2026-06-30']};
 const projected=projectDossier(d,[30,'2026-10-01']);
 expect(projected.tests.find(t=>t.id==='moat')?.provisional).toEqual(d.tests.moat.provisional);
 expect(schemas.dossier.parse(projected)).toMatchObject({tests:expect.arrayContaining([expect.objectContaining({id:'moat',provisional:d.tests.moat.provisional})])});
});
