import {it,expect} from 'vitest';
import {businessLines,relationAmount} from '../../../lib/value/flags/presentation';
import type {Analysis} from '../../../lib/value/types';
import type {BusinessFlag} from '../../../lib/value/flags/types';
const e={quote:'Reported fact',url:'https://example.com/filing',filed:'2026-01-01',section:'Notes'};
const flag=(id:number,tone:'red'|'green',severity:number):BusinessFlag=>({id:String(id),kind:'test',tone,severity,label:`Signal ${id}`,theme:'Balance sheet',why:'Why it matters.',question:'What next?',evidence:[e],series:[[2025,id]],unit:'count',basis:'computed'});
it('uses one line budget across readings and flags and caps each colour at three',()=>{
 const a={company:{description:'A business.'},judgement:{business:[],facts:[],adjustments:[]},businessDepth:{asOf:'2026-01-01',flags:[1,2,3,4].map(i=>flag(i,'red',90-i)).concat([5,6,7,8].map(i=>flag(i,'green',80-i))),relationships:[]}} as unknown as Analysis;
 const lines=businessLines(a);expect(lines).toHaveLength(6);expect(lines.filter(l=>l.tone==='red')).toHaveLength(3);expect(lines.filter(l=>l.tone==='green')).toHaveLength(3);expect(lines[0].text).toBe('Signal 1');
});
it('leaves unevidenced flags out and exposes no placeholder lines',()=>{
 const a={company:{description:null},businessDepth:{asOf:'2026-01-01',flags:[{...flag(1,'red',99),evidence:[]}],relationships:[]}} as unknown as Analysis;
 expect(businessLines(a)).toEqual([]);
});

it('attributes a supplier revenue percentage to that supplier on the customer dossier',()=>{
 const r={from:'SWKS.US',to:'AAPL.US',name:'Skyworks',percent:.67,metric:'revenue'} as Parameters<typeof relationAmount>[0];
 expect(relationAmount(r,'AAPL.US')).toBe('67% of Skyworks revenue');
 expect(relationAmount({...r,name:'Apple'},'SWKS.US')).toBe('67% revenue');
});
