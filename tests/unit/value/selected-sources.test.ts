import {describe,it,expect,vi} from 'vitest';
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
  const rows=filingCandidates([{...source,riskHeadings:['Export restrictions on China could reduce our GPU sales.','Competition']}],'Issuer');let calls=0;
  const result=await selectSource(rows,'risk','Issuer',async input=>{
   expect(Object.values(input.questions).every((q:any)=>['choice','score'].includes(q.type))).toBe(true);calls++;
   const answers=Object.fromEntries(Object.entries(input.questions).map(([k,q]:any)=>[k,q.type==='choice'?{type:'choice',choice:Object.keys(q.criteria).find(k=>k!=='none'),probabilities:Object.fromEntries(Object.keys(q.criteria).map(k=>[k,1])),confidence:1}:{type:'score',score:2,probabilities:{},legend:{},confidence:1}]));
   return {answers,usage:{input_tokens:0}} as any;
  });
  expect(calls).toBe(3);expect(result.selected?.text).toBe(rows[0].text);
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
 const reading:any={version:'literal-17',asOf:'2026-10-02',risk:{selected:c},price:{selected:null},pricing:{selected:null},events:[]};
 const output=applyStory(d,null,reading,true,'2026-10-02');
 expect(memoAtPrice(output)?.lines.find(l=>l.question===6)?.answer).toBe('"China export restrictions" (SEC filing, Sep 2026)');
 expect(applyStory(d,null,reading,false,'2026-10-02').ownerMemo?.lines).toHaveLength(0);
 expect(trustedStory({version:'literal-17',price:{n:40,accuracy:.9},risk:{n:39,accuracy:1}})).toBe(false);
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
 const c=filingCandidates([{...source,riskHeadings:['Export restrictions on China could reduce our GPU sales.']}],'Issuer')[0];
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
it('extracts literal principal-risk table headings before adjacent outlook columns',()=>{
 const text='Principal risks\n\nPrincipal risk Outlook\n\nCapital risk • Motor commission redress may consume our capital.\nThe CET1 requirement applies to this bank.\n\nGovernance report\n\nLegal and regulatory risk • The FCA motor commission scheme could cost £200 million.\nThe Supreme Court ruling affects our motor finance book.\n\nViability statement\n';
 const rows=filingCandidates([{...source,text}],'CBG').filter(c=>c.kind==='risk');
 expect(rows.map(c=>c.text)).toContain('Legal and regulatory risk');
 const heading=rows.find(c=>c.text==='Legal and regulatory risk')!;
 expect(heading.context).toContain('FCA motor commission');
 expect(text.slice(heading.offset,heading.offset+heading.text.length)).toBe(heading.text);
 expect(rows.some(c=>c.text.includes(' • '))).toBe(false);
});
it('rejects advice roundups and generic news-index headlines',()=>{
 const base={kind:'price' as const,date:'2026-10-01',url:'https://news.example/a',context:'A real business cause appears only in this context.',source:'News',section:'News headline',offset:0,id:'x'};
 for(const text of ['Adobe Drops 40%: Buy, Sell or Hold the Stock?','1 Software Stock on Our Buy List and 2 We Avoid','Company News for Sep 11, 2026','This article first appeared on GuruFocus.'])expect(rejectionReason({...base,text})).toBeTruthy();
});
it('reads split and em-dash Item 1A anchors and skips trailing contents entries',()=>{
 for(const anchor of ['ITEM 1A.\n\nRISK FACTORS.','Item 1A—Risk Factors','Risk Factors']){
  const text=anchor+'\n\nChina export restrictions may stop our GPU sales.\n\nOur H100 chips are subject to named export licenses and the China market represents a material share of demand.\n\nItem 1B. Unresolved Staff Comments\n\nNone.\n\nItem 1A Risk Factors\n\nPage 27\n\nItem 1B Unresolved Staff Comments';
  expect(filingCandidates([{...source,text}],'Issuer').some(c=>c.text==='China export restrictions may stop our GPU sales.')).toBe(true);
 }
});
it('rejects historical body narrative as a risk heading',()=>{
 expect(rejectionReason({kind:'risk',text:'Over the past three years, we have faced shifting export restrictions.'} as any)).toBe('body-narrative');
});
it('does not rerun unrelated choice batches after a selected source fails scoring',async()=>{
 const rows=Array.from({length:48},(_,i)=>({id:'c'+i,kind:'risk' as const,text:`China exposure risk ${i}`,context:`Exposure ${i}`,source:'SEC filing',date:'2026-01-01',url:'https://sec.gov/filing',section:'risk',offset:i}));
 let unrelated=0;
 const result=await selectSource(rows,'risk','Issuer',async input=>({answers:Object.fromEntries(Object.entries(input.questions).map(([key,q]:any)=>{
  if(q.type==='choice'){
   const ids=Object.keys(q.criteria).filter(k=>k!=='none');const match=ids.find(k=>k==='c0'||k==='c1');if(!match)unrelated++;
   return[key,{type:'choice',choice:match??ids[0],probabilities:{},confidence:1}];
  }
  return[key,{type:'score',score:input.state.includes('Exposure 1')?2:0,probabilities:{},legend:{},confidence:1}];
 }))}as any));
 expect(result.selected?.id).toBe('c1');expect(unrelated).toBe(2);
});
it('keeps the start of a risk section when every PDF page repeats Item 1A',()=>{
 const text='Item 1A. Risk Factors\n\nItem 1B. Unresolved Staff Comments\n\nItem 1A. Risk Factors\n\nChina export restrictions may stop our GPU sales.\n\nOur H100 chips are subject to named export licenses and the China market represents a material share of demand.\n\nITEM 1A. RISK FACTORS\n\nVoting control may prevent a takeover.\n\nThe class B shares permit the founders to exercise control of the company across a range of corporate actions.\n\nItem 1B. Unresolved Staff Comments';
 expect(filingCandidates([{...source,text}],'Issuer').filter(c=>c.kind==='risk').map(c=>c.text)).toContain('China export restrictions may stop our GPU sales.');
});
it('does not offer another issuer news just because the vendor tagged the requested ticker',async()=>{
 const rows=newsCandidates([{date:'2026-09-01',title:'Amazon falls as cloud demand slows',content:'Amazon shares fell after weak AWS growth.',link:'https://news.example/a'},{date:'2026-09-01',title:'Adobe falls as AI rivals cut prices',content:'Adobe faces cheaper AI tools.',link:'https://news.example/b'}]);
 const result=await selectSource(rows,'price','Adobe Systems Incorporated',async input=>{
  expect(input.state).not.toContain('Amazon');
  return {answers:Object.fromEntries(Object.entries(input.questions).map(([k,q]:any)=>[k,q.type==='choice'?{type:'choice',choice:Object.keys(q.criteria).find(k=>k!=='none'),probabilities:{},confidence:1}:{type:'score',score:2,probabilities:{},legend:{},confidence:1}]))}as any;
 });
 expect(result.selected?.text).toContain('Adobe');expect(result.rejected['other-company-news']).toBe(2);
});
it('packs short news choices efficiently without dropping candidates or exceeding the byte budget',async()=>{
 const rows=Array.from({length:80},(_,i)=>({id:'n'+i,kind:'price' as const,text:`Issuer falls as China export restrictions bite ${i}`,context:'Issuer cannot sell its GPU products in China.',source:'News',date:'2026-01-01',url:'https://news.example/a',section:'News headline',offset:i}));
 const seen=new Set<string>();let calls=0;
 await selectSource(rows,'price','Issuer',async input=>{
  calls++;expect(Buffer.byteLength(JSON.stringify(input))).toBeLessThan(30000);
  const q:any=input.questions.pick;Object.keys(q.criteria).filter(k=>k!=='none').forEach(k=>seen.add(k));
  return {answers:{pick:{type:'choice',choice:'none',probabilities:{none:1},confidence:1}}};
 });
 expect(seen.size).toBe(80);expect(calls).toBe(2);
});
it('retains a supporting risk paragraph when its named exposure appears after 1800 characters',()=>{
 const paragraph='Our software market evolves rapidly and requires continued innovation. '.repeat(32)+'Adobe Firefly and Creative Cloud face generative AI alternatives.';
 const text='Item 1A. Risk Factors\n\nFailure to adapt our software may reduce revenue.\n\n'+paragraph+'\n\nItem 1B. Unresolved Staff Comments';
 const row=filingCandidates([{...source,text}],'Adobe').find(c=>c.text==='Failure to adapt our software may reduce revenue.')!;
 expect(row.context).toContain('Adobe Firefly and Creative Cloud');expect(text.includes(row.text)).toBe(true);
});

it('skips contents page ranges and unnumbered contents before the real risk section',()=>{
 const text='Risk Factors\n\n27\n\nCybersecurity\n\n34\n\nItem 1A. Risk Factors\n\n9-31\n\nItem 1B. Unresolved comments\n\nItem 1A. Risk Factors\n\nChina export restrictions threaten GPU sales.\n\nWe supply GPUs to Chinese data centers and restrictive export licensing could reduce these sales substantially.\n\nITEM 1B. Unresolved comments';
 const rows=filingCandidates([{...source,text}],'Issuer');
 expect(rows.map(c=>c.text)).toEqual(['China export restrictions threaten GPU sales.']);
});

it('uses a literal first coordinated or conditional clause without cutting a list',()=>{
 expect(literalHeadingClause('We face intense competition in creative software, and our revenues could decline significantly.',10)).toBe('We face intense competition in creative software');
 expect(literalHeadingClause('If our brands are damaged, our sales and financial results could be adversely affected.',8)).toBe('If our brands are damaged');
 expect(literalHeadingClause('We face risks from countries, currencies, regulations and other factors affecting our global business',5)).toBeNull();
});
it('rejects truncated long risk prose before requesting a model choice',()=>{
 expect(rejectionReason({kind:'risk',text:'Changes in regulation may adversely affect our revenue and financial conditi'} as any)).toBe('sentence-fragment');
});

it('uses verified filing heading markup instead of body-paragraph guesses',()=>{
 const heading='Commodity price changes affect our oil business';
 const text='Item 1A. Risk Factors\n\n'+heading+' We produce crude oil and gas, and low prices directly reduce earnings.\n\nSome suppliers charge us higher prices during shortages.\n\nThis much longer body paragraph explains a supplier exposure but is not a heading in the original filing.';
 const rows=filingCandidates([{...source,text,riskHeadings:[heading,'Commodity']} as any],'Issuer');
 expect(rows.filter(c=>c.kind==='risk').map(c=>c.text)).toEqual([heading]);
 expect(rows[0].offset).toBe(text.indexOf(heading));
});

it('trims a complete coordinated predicate, not an arbitrary list item',()=>{
 expect(literalHeadingClause('Our cloud and AI strategy requires substantial investments and depends on evolving demand and market conditions.',10)).toBe('Our cloud and AI strategy requires substantial investments');
 expect(literalHeadingClause('We rely on customers and suppliers in multiple countries and regional markets for continued growth.',5)).toBeNull();
});

it('reads the actual risk paragraph when a summary repeats its heading first',()=>{
 const heading='Our cloud strategy requires major investment.';
 const text='Item 1A. Risk Factors\n\n'+heading+'\n\nOther summary heading\n\n'+heading+'\n\nOur Cloud platform requires billions in datacenter capacity before customer demand materializes. This is the substantive supporting disclosure.';
 const rows=filingCandidates([{...source,text,riskHeadings:[heading,'Other summary heading']} as any],'Issuer');
 const chosen=rows.find(c=>c.text===heading)!;
 expect(chosen.offset).toBe(text.lastIndexOf(heading));
 expect(chosen.context).toContain('billions in datacenter');
});

it('rejects listicle body sentences and broken abbreviation/anaphor sentences',()=>{
 const rows=newsCandidates([{date:'2026-09-01',title:'Top Stock Picks for September',content:'Alphabet grew cloud sales by 30%.',link:'https://news.example/list'}]);
 expect(rows.every(c=>!!rejectionReason(c))).toBe(true);
 expect(rejectionReason({...rows[0],text:'AVGO Stock Drops 20%: Should You Buy on the Dip?',context:'AVGO Stock Drops 20%: Should You Buy on the Dip?'})).toBeTruthy();
 expect(rejectionReason({...rows[0],text:'Boeing shares fell after the U.S.',context:'Boeing shares fell after the U.S.',section:'News first paragraph'})).toBe('sentence-fragment');
 expect(rejectionReason({...rows[0],text:'That pace has now cooled to single digits.',context:'A report of growth.'})).toBe('unanchored-cause');
});

it('withholds guessed body headings and keeps verified source headings eligible',()=>{
 const guessed=filingCandidates([source],'Issuer')[0];
 expect(rejectionReason(guessed)).toBe('unverified-heading');
 const verified=filingCandidates([{...source,riskHeadings:[guessed.text]}],'Issuer')[0];
 expect(rejectionReason(verified)).toBeNull();
});
it('rescoring an old winner cannot bypass the current score gate',async()=>{
 const rows=newsCandidates([{date:'2026-09-01',title:'Issuer shares rise',content:'',link:'https://news.example/old'},{date:'2026-09-01',title:'Issuer raises earnings outlook as cloud demand grows',content:'Cloud customers expanded orders.',link:'https://news.example/new'}]);
 let rejectedOld=false;
 const result=await selectSource(rows,'price','Issuer',async input=>{
  const answers=Object.fromEntries(Object.entries(input.questions).map(([key,q]:any)=>[key,q.type==='choice'?{type:'choice',choice:Object.keys(q.criteria).find(k=>k!=='none'),probabilities:{},confidence:1}:{type:'score',score:input.state.includes('SELECTED QUOTE: Issuer shares rise')?0:2,probabilities:{},legend:{},confidence:1}]));
  if(input.state.includes('SELECTED QUOTE: Issuer shares rise'))rejectedOld=true;
  return {answers,usage:{input_tokens:0}} as any;
 },'',[],rows[0]);
 expect(rejectedOld).toBe(true);expect(result.selected?.id).toBe(rows[1].id);
});

it('retains a complete main clause before a relative risk qualifier',()=>{
 expect(literalHeadingClause('The Company is subject to significant legal proceedings that can result in substantial costs and damages.',10)).toBe('The Company is subject to significant legal proceedings');
 expect(literalHeadingClause('Products that customers demand are essential for our financial success and future growth.',4)).toBeNull();
});

it('reads a verified principal-risk table headed Risk management',()=>{
 const heading='Changes in technology and customer preferences';
 const text='Risk management\n\n'+heading+'\n\nGenerative AI can replace professional information workflows. We invest 12% of revenue in product development.';
 const rows=filingCandidates([{...source,text,riskHeadings:[{text:heading,offset:text.indexOf(heading)}]}],'WKL');
 expect(rows[0]?.text).toBe(heading);expect(rows[0]?.headingVerified).toBe(true);
 expect(filingCandidates([{...source,text}],'WKL')).toHaveLength(0);
});
it('does not borrow a heading style from another occurrence of the same words',()=>{
 const heading='Supplier dependence';
 const text='Item 1A. Risk Factors\n\n'+heading+' is explained in this unstyled body paragraph.\n\n'+heading+'\n\nOur sole foundry supplier manufactures our advanced chips in Taiwan.';
 const rows=filingCandidates([{...source,text,riskHeadings:[{text:heading,offset:text.lastIndexOf(heading)}]}],'Issuer');
 expect(rows).toHaveLength(1);expect(rows[0].offset).toBe(text.lastIndexOf(heading));
});

it('rejects encoded markup instead of printing entity text as a headline',()=>{
 const c=newsCandidates([{date:'2026-09-01',title:'Apple grows iPhone &amp; Mac sales',link:'https://news.example/apple'}])[0];
 expect(rejectionReason(c)).toBe('source-markup');
});

it('does not mistake a comma-separated list for a complete heading clause',()=>{
 expect(literalHeadingClause('Dependency on suppliers to manufacture, assemble, test, or package our products reduces our control over delivery schedules and quality.',10)).toBeNull();
});
it('rejects a literal risk clause that omits the actual exposure even if its paragraph is material',async()=>{
 const c:any={id:'activity',kind:'risk',text:'We purchase a significant amount of materials',context:'We purchase materials from a single supplier.',source:'SEC filing',date:'2026-02-01',url:'https://sec.gov/risk',section:'risk',offset:0,headingVerified:true};
 const result=await selectSource([c],'risk','Issuer',async input=>({answers:Object.fromEntries(Object.entries(input.questions).map(([key,q]:any)=>[key,q.type==='choice'?{type:'choice',choice:'activity',probabilities:{activity:1},confidence:1}:{type:'score',score:key==='meaning'?0:2,probabilities:{},legend:{},confidence:1}]))} as any));
 expect(result.selected).toBeNull();
});

it('keeps the complete first clause before a parenthetical conditional conjunction',()=>{
 const text='We participate in rapidly evolving and intensely competitive markets, and, if we do not compete effectively, our business and financial results could materially suffer.';
 expect(literalHeadingClause(text,14)).toBe('We participate in rapidly evolving and intensely competitive markets');
});
it('rejects a broker rating headline even when it describes a business driver',()=>{
 const c=newsCandidates([{date:'2026-09-01',title:'Mizuho upgrades Visa as it sees decade-long growth from cash-to-card shift',link:'https://news.example/visa'}])[0];
 expect(rejectionReason(c)).toBe('targets-ratings-sentiment-listicles');
});
it('ends a risk chapter before Other Key Information in a non-Item-numbered annual report',()=>{
 const heading='Reliance on our foundry suppliers';const furniture='Current Title';
 const text=`Risk Factors\n\n${heading}\n\nWe depend on a single named foundry.\n\nOther Key Information\n\nInformation About Our Executive Officers\n\n${furniture}\n\nChief executive officer`;
 const rows=filingCandidates([{...source,text,riskHeadings:[{text:heading,offset:text.indexOf(heading)},{text:furniture,offset:text.indexOf(furniture)}]}],'Issuer');
 expect(rows.map(c=>c.text)).toEqual([heading]);
});
it('rejects advice-list articles even when their headline describes a concrete business event',()=>{
 const c=newsCandidates([{date:'2026-09-01',title:'Mastercard launches a new payment network',content:'Mastercard is on our list of the most profitable stocks to buy according to hedge funds.',link:'https://news.example/ma'}])[0];
 expect(rejectionReason(c)).toBe('targets-ratings-sentiment-listicles');
});
it('rejects an unfinished first-paragraph fragment supplied by a news feed',()=>{
 const c=newsCandidates([{date:'2026-09-01',title:'Johnson reports growth',content:'Johnson reported above-peer top-line growth and a limited loss-of-exclusivity',link:'https://news.example/jnj'}])[1];
 expect(rejectionReason(c)).toBe('sentence-fragment');
});
it('does not retain a clause ending with a dangling possessive or auxiliary verb',()=>{
 expect(literalHeadingClause("Changes in interest rates could adversely affect Cat Financial's and our cash flows.",12)).toBeNull();
 expect(literalHeadingClause('Our market-making activities have been and may in the future be affected by changes in volatility.',12)).toBeNull();
});
it('selects a literal supporting exposure before scoring a risk heading',async()=>{
 const c:any={id:'risk',kind:'risk',text:'Our platform depends on third-party developers.',context:'Our platform depends on third-party developers.\n\nOur minority share in smartphone markets can reduce developer investment in our platform.',source:'SEC filing',date:'2026-02-01',url:'https://sec.gov/risk',section:'risk',offset:0,headingVerified:true};
 const result=await selectSource([c],'risk','Issuer',async input=>({answers:Object.fromEntries(Object.entries(input.questions).map(([key,q]:any)=>[key,q.type==='choice'?{type:'choice',choice:key==='exposure'?'e0':'risk',probabilities:{},confidence:1}:{type:'score',score:2,probabilities:{},legend:{},confidence:1}]))} as any));
 expect(result.selected?.text).toBe(c.text);
 expect((result as any).support?.text).toBe('Our minority share in smartphone markets can reduce developer investment in our platform.');
 expect(c.context.slice((result as any).support.offset)).toBe((result as any).support.text);
});
it('does not treat short tickers as substrings of ordinary news words',async()=>{
 const rows=newsCandidates([{date:'2026-09-01',title:'Amazon expands its retail market',content:'Amazon increases sales in its main markets.',link:'https://news.example/amzn'},{date:'2026-09-01',title:'MA payment volume rises',content:'MA reported stronger card payment volume.',link:'https://news.example/ma'}]);
 const offered:string[]=[];await selectSource(rows,'price','Mastercard Incorporated',async input=>{const q:any=input.questions.pick;offered.push(...Object.values(q.criteria).filter((s:any)=>s!=='None is suitable')as string[]);return {answers:{pick:{type:'choice',choice:'none',probabilities:{none:1},confidence:1}}};},'', ['MA']);
 expect(offered.some(text=>text.includes('Amazon'))).toBe(false);expect(offered.some(text=>text.includes('MA payment'))).toBe(true);
});
it('requires a complete token for a short issuer name as well as a short ticker',async()=>{
 const rows=newsCandidates([{date:'2026-09-01',title:'Shell cuts costs by GBP 300 million',content:'Shell announced GBP savings.',link:'https://news.example/shell'}]);
 let calls=0;const result=await selectSource(rows,'price','BP p.l.c.',async()=>{calls++;return {answers:{pick:{type:'choice',choice:'none',probabilities:{none:1},confidence:1}}};},'', ['BP']);
 expect(calls).toBe(0);expect(result.rejected['other-company-news']).toBe(rows.length);
});

it('refreshes a weekly mover even when its recent source set is unchanged',async()=>{
 const {mkdtempSync,rmSync,mkdirSync,writeFileSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const {gzipSync}=await import('node:zlib');const {createHash}=await import('node:crypto');
 const {writeCorpusJson,readCorpusJson}=await import('../../../lib/value/corpus');
 const {default:run}=await import('../../../scripts/value/stages/price-story');
 const directory=mkdtempSync(join(tmpdir(),'value-story-mover-'));
 const now=new Date(),today=now.toISOString().slice(0,10),ago=(days:number)=>new Date(now.getTime()-days*86400000).toISOString();
 vi.stubEnv('VALUE_CORPUS_DIR',directory);vi.stubEnv('STORY_MIN_FREE_GIB','4');vi.stubEnv('JEV_API_KEY','unit-test-placeholder');
 const fetcher=vi.fn(async(_url:unknown,init?:RequestInit)=>{
  const {questions}=JSON.parse(init!.body as string);
  return Response.json({answers:Object.fromEntries(Object.entries(questions).map(([key,q]:any)=>[key,q.type==='choice'?{type:'choice',choice:Object.keys(q.criteria).find(k=>k!=='none'),probabilities:Object.fromEntries(Object.keys(q.criteria).map(k=>[k,k==='none'?0:1])),confidence:1}:{type:'score',score:2,probabilities:{'2':1},legend:{'2':'supported'},confidence:1}])),usage:{input_tokens:1}});
 });vi.stubGlobal('fetch',fetcher);
 try{
  const rows=[{date:ago(3).slice(0,10),title:'Issuer raises sales outlook as demand grows',link:'https://news.example/issuer'}],candidates=newsCandidates(rows),empty={selected:null,scores:{},rejected:{},considered:0};
  const d:any={id:'T.US',company:{name:'Issuer Inc',code:'T',kind:'operating',currency:'USD'},report:{filed:today,url:'https://issuer.example/annual'},asOf:today,valuation:null,tests:{moat:{series:{}}},series:{},priceHistory:[]};
  writeCorpusJson('publish-repo/dossiers/t.json',{'T.US':d});writeCorpusJson('prices/t.json',{'T.US':[120,today,'eodhd']});
  writeCorpusJson('price-story/weekly-prices.json',{'T.US':[[ago(7).slice(0,10),100]]});
  mkdirSync(join(directory,'price-story/news'),{recursive:true});writeFileSync(join(directory,'price-story/news/T.US.json.gz'),gzipSync(JSON.stringify({checked:today,rows})));
  writeCorpusJson('price-story/readings/T.US.json',{version:'literal-17',asOf:ago(2),newsStatus:'cached',candidatesHash:createHash('sha256').update(JSON.stringify(candidates)).digest('hex'),price:empty,risk:empty,pricing:empty,events:[]});
  await run({only:['T.US'],cachedNews:true});
  const reading=readCorpusJson<any>('price-story/readings/T.US.json');
  expect(reading.asOf.slice(0,10)).toBe(today);expect(reading.price.selected?.text).toBe(rows[0].title);expect(fetcher).toHaveBeenCalledTimes(2);
 }finally{vi.unstubAllGlobals();vi.unstubAllEnvs();rmSync(directory,{recursive:true,force:true});}
});
