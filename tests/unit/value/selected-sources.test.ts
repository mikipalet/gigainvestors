import {describe,it,expect} from 'vitest';
import {filingCandidates,newsCandidates,rejectionReason,selectSource} from '../../../lib/value/price-story/selection';
import {composePriceStory,pricingFallback,refreshQueue,literalHeadingClause} from '../../../lib/value/price-story/compose';
const source={text:'Item 1A. Risk Factors\n\nExport restrictions on China could reduce our GPU sales.\n\nWe sell GPUs to Chinese data centers. This is a longer explanatory paragraph about the exposure.\n\nCompetition\n\nWe compete globally.',url:'https://issuer.example/annual',filed:'2026-02-01',period:'2025-12-31',section:'risk',quote:''};
describe('literal source selection',()=>{
 it('retains a complete literal first clause of a long risk heading',()=>{
  const heading='We rely on our bottling partners for a significant portion of our business. If we are unable to maintain good relationships with our bottling partners, our business could suffer.';
  expect(literalHeadingClause(heading,13)).toBe('We rely on our bottling partners for a significant portion of our business.');
  expect(literalHeadingClause('China export controls restrict our GPU sales; these restrictions may expand.',8)).toBe('China export controls restrict our GPU sales');
  expect(literalHeadingClause('A very long heading with no complete clause that will fit the permitted space',5)).toBeNull();
 });
 it('extracts risk headings without manufacturing sentence endings',()=>{
  const rows=filingCandidates([source],'Issuer');
  expect(rows.filter(c=>c.kind==='risk').map(c=>c.text)).toContain('Export restrictions on China could reduce our GPU sales.');
  expect(rows.every(c=>source.text.includes(c.text))).toBe(true);
 });
 it('keeps a news title and first paragraph sentences literal',()=>{
  const rows=newsCandidates([{date:'2026-09-01',title:'Adobe falls as AI rivals cut prices',content:'Adobe faces cheaper AI tools. Sales grew.\n\nLater paragraph.',link:'https://news.example/a',source:'Reuters'}]);
  expect(rows.map(c=>c.text)).toEqual(['Adobe falls as AI rivals cut prices','Adobe faces cheaper AI tools.','Sales grew.']);
  expect(rows[0].context).toContain('Adobe faces cheaper AI tools.');
 });
 it('rejects analyst targets, listicles and generic headings',()=>{
  for(const text of ['Analyst raises price target to $200','5 stocks to buy now','Competition','Cybersecurity risks','Principal risk Outlook','See page 86.'])expect(rejectionReason({kind:'risk',text} as any)).toBeTruthy();
 });
 it('uses only choice/score questions and never accepts model-authored strings',async()=>{
  const rows=filingCandidates([source],'Issuer');let calls=0;
  const result=await selectSource(rows,'risk','Issuer',async input=>{
   expect(Object.values(input.questions).every((q:any)=>['choice','score'].includes(q.type))).toBe(true);calls++;
   const answers=Object.fromEntries(Object.entries(input.questions).map(([k,q]:any)=>[k,q.type==='choice'?{type:'choice',choice:Object.keys(q.criteria).find(k=>k!=='none'),probabilities:Object.fromEntries(Object.keys(q.criteria).map(k=>[k,1])),confidence:1}:{type:'score',score:4,probabilities:{},legend:{},confidence:1}]));
   return {answers,usage:{input_tokens:0}} as any;
  });
  expect(calls).toBe(2);expect(result.selected?.text).toBe(rows[0].text);
 });
});
it('scores the remaining tournament finalist when the first winner fails the gate',async()=>{
 const rows=Array.from({length:17},(_,i)=>({id:String(i),kind:'risk' as const,text:`China exposure risk ${i}`,context:`Exposure ${i}`,source:'SEC filing',date:'2026-01-01',url:'https://sec.gov/filing',section:'risk',offset:i}));
 const result=await selectSource(rows,'risk','Issuer',async input=>({answers:Object.fromEntries(Object.entries(input.questions).map(([key,q]:any)=>[key,q.type==='choice'?{type:'choice',choice:Object.keys(q.criteria).find(k=>k!=='none'),probabilities:{},confidence:1}:{type:'score',score:input.state.includes('Exposure 16')?2:0,probabilities:{},legend:{},confidence:1}]))} as any));
 expect(result.selected?.id).toBe('16');
});
describe('computed composition',()=>{
 const d:any={id:'A.US',company:{kind:'operating',currency:'USD'},asOf:'2026-10-02',report:{url:'https://issuer.example/annual',filed:'2026-02-01'},tests:{moat:{series:{grossMargin:[[2021,.60],[2022,.61],[2023,.60]]}}},series:{revenue:[[2024,100],[2025,110]]},priceHistory:[['2024-02',100],['2026-09',55]],valuation:null};
 it('composes a bounded line with literal source attribution and computed filing data',()=>{
  const candidate:any={kind:'price',text:'Adobe falls as AI rivals cut prices',source:'Reuters',date:'2026-09-01',url:'https://news.example/a'};
  const s=composePriceStory(d,[55,'2026-10-01'],candidate,[],'2026-10-02');
  expect(s.line).toContain('Down 45% since Feb 2024');expect(s.line).toContain('"Adobe falls as AI rivals cut prices" (Reuters, Sep 2026)');expect(s.line.split(/\s+/).length).toBeLessThanOrEqual(30);
 });
 it('drops stale quotes and never emits gap wording',()=>{
  const s=composePriceStory(d,[55,'2026-10-01'],{text:'AI tools compete',date:'2024-01-01',source:'Reuters'} as any,[],'2026-10-02');
  expect(s.line).not.toContain('"');expect(s.line).toContain('sales +10%');
 });
 it('only claims held margins with all three actual years within two points',()=>{
  expect(pricingFallback(d)?.answer).toContain('61%');
  expect(pricingFallback({...d,tests:{moat:{series:{grossMargin:[[2021,.6],[2022,.63],[2023,.6]]}}}})).toBeNull();
  expect(pricingFallback({...d,company:{kind:'bank'}})).toBeNull();
 });
 it('adds weekly movers outside the 400-company rotation',()=>{
  const ids=Array.from({length:402},(_,i)=>String(i));
  const q=refreshQueue(ids,{},new Set(['401']),'2026-10-02',400);
  expect(q).toHaveLength(401);expect(q).toContain('401');
 });
});

import {applyStory,trustedStory} from '../../../lib/value/price-story/publication';
import {memoAtPrice} from '../../../lib/value/owner-memo';
it('publication retains an attributed literal heading through memo recomposition',()=>{
 const c:any={text:'China export restrictions',source:'SEC filing',date:'2026-09-01',url:'https://sec.gov/filing',section:'risk',kind:'risk'};
 const d:any={id:'T.US',company:{kind:'operating',currency:'USD'},report:{filed:'2026-09-01',url:'https://sec.gov/filing'},asOf:'2026-10-02',valuation:null,tests:{moat:{series:{}}},series:{},ownerMemo:{version:1,asOf:'2026-10-02',inputHash:'x',lines:[]}};
 const reading:any={version:'literal-4',asOf:'2026-10-02',risk:{selected:c},price:{selected:null},pricing:{selected:null},events:[]};
 const output=applyStory(d,null,reading,true,'2026-10-02');
 expect(memoAtPrice(output)?.lines.find(l=>l.question===6)?.answer).toBe('"China export restrictions" (SEC filing, Sep 2026)');
 expect(applyStory(d,null,reading,false,'2026-10-02').ownerMemo?.lines).toHaveLength(0);
 expect(trustedStory({version:'literal-4',price:{n:40,accuracy:.9},risk:{n:39,accuracy:1}})).toBe(false);
});
it('does not treat loosely tagged topical windows or risk category labels as headings',()=>{
 const junk={...source,text:'Supply of Components\n\nWe purchase chips from many suppliers.',section:'risk'};
 expect(filingCandidates([junk],'Issuer').filter(c=>c.kind==='risk')).toHaveLength(0);
 expect(rejectionReason({...source,kind:'risk',text:'Risks Related to Our Industry and Markets',date:source.filed} as any)).toBe('generic-risk');
});
it('uses bank filing profits and the existing bank valuation horizon',()=>{
 const d:any={company:{kind:'bank',currency:'USD'},report:{url:'https://issuer.example/annual',filed:'2026-02-01'},asOf:'2026-10-02',tests:{moat:{series:{}}},series:{netIncome:[[2024,100],[2025,110]]},valuation:null,priceHistory:[['2023-10',100],['2026-09',140]]};
 const story=composePriceStory(d,[140,'2026-10-01'],null,[],'2026-10-02');
 expect(story.line).toContain('net income +10%');expect(story.facts[0].label).toContain('Net income');
});
it('keeps multilingual selection batches inside the Jev byte limit',async()=>{
 const rows=Array.from({length:20},(_,i)=>({id:String(i),kind:'risk' as const,text:`中国への輸出制限リスク ${i}`,context:'製品の輸出規制による収益への影響。'.repeat(100),source:'Filing',date:'2026-01-01',url:'https://issuer.example/filing',section:'risk',offset:i}));
 await selectSource(rows,'risk','Toyota',async input=>{
  expect(Buffer.byteLength(JSON.stringify(input))).toBeLessThan(30000);
  return {answers:{pick:{type:'choice',choice:'none',probabilities:{none:1},confidence:1}}};
 });
});
it('does not turn a PDF tail into a pricing sentence or an anaphor into a driver',()=>{
 expect(rejectionReason({kind:'pricing',text:'favourable pricing due to channel mix in the US, which offset'} as any)).toBe('sentence-fragment');
 expect(rejectionReason({kind:'price',text:'These increases took effect as at 1 January 2026.'} as any)).toBe('unanchored-cause');
});
it('rejects a leading percentage fragment and subjective pricing claims',()=>{
 expect(rejectionReason({kind:'pricing',text:'5.8%, supported by strong pricing and mix benefits in all regions.'} as any)).toBe('sentence-fragment');
 expect(rejectionReason({kind:'pricing',text:'Our transparent and competitive pricing is evident through our latest cross-border take rate.'} as any)).toBe('subjective-pricing-claim');
});
it('stops risk headings before Item 1C and rejects lowercase body fragments',()=>{
 const text=source.text+'\n\nITEM 1C. CYBERSECURITY\n\nCybersecurity Program and Incident Response\n\nThe company maintains controls and processes to monitor and respond to security incidents.';
 expect(filingCandidates([{...source,text}],'Issuer').some(c=>c.text==='Cybersecurity Program and Incident Response')).toBe(false);
 const c=filingCandidates([source],'Issuer')[0];
 expect(rejectionReason({...c,text:'systems. Even if such breach is unrelated to our systems, our business could suffer.'})).toBe('sentence-fragment');
});
it('tries another eligible source in a single batch after the first fails scoring',async()=>{
 const rows=Array.from({length:2},(_,i)=>({id:String(i),kind:'risk' as const,text:`China exposure risk ${i}`,context:`Exposure ${i}`,source:'SEC filing',date:'2026-01-01',url:'https://sec.gov/filing',section:'risk',offset:i}));
 const result=await selectSource(rows,'risk','Issuer',async input=>({answers:Object.fromEntries(Object.entries(input.questions).map(([key,q]:any)=>[key,q.type==='choice'?{type:'choice',choice:Object.keys(q.criteria).find(k=>k!=='none'),probabilities:{},confidence:1}:{type:'score',score:input.state.includes('Exposure 1')?2:0,probabilities:{},legend:{},confidence:1}]))} as any));
 expect(result.selected?.id).toBe('1');
});
it('extracts numbered Japanese business-risk headings with literal offsets',()=>{
 const text='３ 【事業等のリスク】\n\n（１）市場および事業に関するリスク\n ①自動車市場の競争激化\n 世界の自動車市場では激しい競争が繰り広げられています。\n トヨタは競争に直面しています。\n\n ②自動車市場の需要変動\n トヨタの販売は世界各国の市場に依存しています。\n\n４ 【経営者による分析】\n';
 const rows=filingCandidates([{...source,text}],'Toyota').filter(c=>c.kind==='risk');
 expect(rows.map(c=>c.text)).toEqual(['①自動車市場の競争激化','②自動車市場の需要変動']);
 for(const c of rows)expect(text.slice(c.offset,c.offset+c.text.length)).toBe(c.text);
});
