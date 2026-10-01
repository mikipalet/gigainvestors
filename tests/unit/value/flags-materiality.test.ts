import {it,expect} from 'vitest';
import {materialFlags,economicRelationships} from '../../../lib/value/flags/materiality';
import {businessLines} from '../../../lib/value/flags/presentation';
import type {Analysis} from '../../../lib/value/types';
import type {BusinessFlag,Relationship} from '../../../lib/value/flags/types';
const e={quote:'Disclosed exposure in the annual filing.',url:'https://example.com/annual',filed:'2026-02-20',section:'notes'};
const flag=(kind:string,value:number,unit:BusinessFlag['unit']='money'):BusinessFlag=>({id:kind,kind,label:kind,theme:'Obligations off the balance sheet',tone:'red',severity:93,series:[[2025,value]],unit,currency:'USD',evidence:[kind.endsWith('_concentration')?{...e,quote:`One customer accounts for ${value*100}% of consolidated revenue.`}:e],basis:'computed',why:'Exposure',question:'How large?'});
const a={company:{id:'KO.US',marketCapUsd:300e9},reportingCurrency:'USD',valuation:{method:'owner_earnings',currency:'USD',normalized:10e9},series:{}} as Analysis;
it('withholds KO-sized guarantees below both materiality thresholds',()=>expect(materialFlags([flag('third_party_guarantee',786e6)],a)).toEqual([]));
it('uses strict money thresholds, inclusive concentration and ranks relative exposure',()=>{
 expect(materialFlags([flag('related_party',1e9)],a)).toEqual([]);
 const result=materialFlags([flag('third_party_guarantee',1.1e9),flag('uncommenced-leases',260e9)],a);
 expect(result.map(f=>f.kind)).toEqual(['uncommenced-leases','third_party_guarantee']);
 expect(materialFlags([flag('customer_concentration',.1,'percent')],a)).toHaveLength(1);
 expect(materialFlags([flag('customer_concentration',.099,'percent')],a)).toHaveLength(0);
});
it('does not compare mismatched currencies or treat missing/negative earnings as a denominator',()=>{
 expect(materialFlags([{...flag('third_party_guarantee',1e9),currency:'JPY'}],a)).toEqual([]);
 expect(materialFlags([flag('third_party_guarantee',1)],{...a,valuation:null,company:{...a.company,marketCapUsd:null}})).toEqual([]);
});
it('keeps economic dependencies and excludes internal and transaction service relationships',()=>{
 const edge=(name:string,type:Relationship['type'],extra={}):Relationship=>({id:name,from:'GOOGL.US',to:name,name,type,evidence:[{...e,disclosedBy:'GOOGL.US'}],status:'one-sided',...extra});
 const rows=[edge('GV','subsidiary'),edge('Google Ireland Holdings','related-party'),edge('Trustee Bank','contract',{amount:20e9,evidence:[{...e,quote:'Trustee Bank serves as indenture trustee.',disclosedBy:'GOOGL.US'}]}),edge('Anthropic','stake'),edge('SpaceX','stake'),edge('Strategic partner','contract',{amount:10e9}),edge('Customer X','customer',{percent:.15,metric:'revenue'})];
 expect(economicRelationships(rows,'GOOGL.US').map(r=>r.name)).toEqual(['Anthropic','SpaceX','Strategic partner','Customer X']);
});
it('ranks numeric red and green flags above generic business lines',()=>{
 const generic={id:'brand',text:'Its brand is widely recognised.',kind:'reading' as const,priority:72,why:e.quote,answer:{type:'short-text' as const,producer:'jev-choice' as const,text:'Its brand is widely recognised.',support:1,evidence:{...e,quote:'Its brand is widely recognised.'}}};
 const f={...flag('net-cash',78e9),label:'Net cash USD 78bn',tone:'green' as const,theme:'Balance sheet' as const};
 const lines=businessLines({...a,businessOverview:[generic],businessDepth:{asOf:'2026-10-01',flags:[f],relationships:[]}});
 expect(lines[0].text).toBe('Net cash USD 78bn');expect(lines[0].tone).toBe('green');
});
it('weights source-backed multi-decade dividend growth alongside risks',async()=>{
 const {dividendStrength}=await import('../../../lib/value/flags/strengths');
 const source={...e,period:'2025-12-31',text:'Our board raised the quarterly dividend to $0.53 per share. This is our 64th consecutive annual increase.'};
 expect(dividendStrength(source)[0].label).toBe('Dividend raised 64 consecutive years');
 expect(dividendStrength({...source,text:'We aim to keep raising our dividend.'})).toEqual([]);
 expect(dividendStrength({...source,text:'We have increased our annual dividend for 50 consecutive years.'})[0].label).toBe('Dividend raised 50 consecutive years');
 expect(dividendStrength({...source,text:'We have paid dividends for 50 consecutive years.'})).toEqual([]);
 const declared=dividendStrength({...source,text:'The annual dividend is $2.12 per share in 2026. This is our 64th consecutive annual increase.'})[0];
 expect(declared.evidence[0].quote).toContain('$2.12');expect(declared.series).toEqual([[2026,64]]);
});
it('uses annual owner earnings when a company has no valuation',()=>{
 const company={...a,valuation:null,tests:{economics:{series:{ownerEarnings:[[2025,18e9]]}}}} as unknown as Analysis;
 expect(materialFlags([flag('residual_guarantee',28e9)],company)).toHaveLength(1);
});
it('sizes current obligations against the latest annual earning power before a historical valuation average',()=>{
 const company={...a,tests:{economics:{series:{ownerEarnings:[[2025,100e9]]}}}} as unknown as Analysis;
 expect(materialFlags([flag('third_party_guarantee',3.5e9)],company)).toEqual([]);
});
it('does not present a subsidiary customer share as a consolidated company concentration',()=>{
 const f={...flag('customer_concentration',.172,'percent'),evidence:[{...e,quote:'McLane’s major customers included Walmart (17.2% of revenues).'}]};
 expect(materialFlags([f],a)).toEqual([]);
});
it('does not substitute fabric production share for the requested revenue materiality basis',()=>{
 const f={...flag('supplier_concentration',.2,'percent'),evidence:[{...e,quote:'Our largest fabric supplier produced 20% of our fabrics.'}]};
 expect(materialFlags([f],a)).toEqual([]);
});
it('continues ranking relative size for very large exposures without a severity-cap tie',()=>{
 const result=materialFlags([flag('related_party',100e9),flag('third_party_guarantee',200e9)],a);
 expect(result[0].kind).toBe('third_party_guarantee');expect(result[0].severity).toBeGreaterThan(result[1].severity);
});
