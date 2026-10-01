import type {BusinessFlag} from './types';
import type {Evidence} from '../judgement/types';
/** Literal, dated dividend streak disclosure; never infer a multi-decade streak from a short series. */
export function dividendStrength(source:Evidence & {text:string;period:string}):BusinessFlag[]{
 for(const paragraph of source.text.split(/\n\s*\n/)){
  if(!/dividend/i.test(paragraph))continue;
  const match=paragraph.match(/\b(\d{2,3})(?:st|nd|rd|th)?\s+consecutive\s+(?:annual|year(?:s)?(?:\s+of)?)\s+(?:annual\s+)?(?:dividend\s+)?increase/i)
   ??paragraph.match(/\b(?:increased|raised)[^.!?\n]{0,60}\bdividends?[^.!?\n]{0,50}\bfor\s+(?:(?:the\s+)?past\s+)?(\d{2,3})\s+consecutive\s+years/i)
   ??paragraph.match(/\bdividends?[^.!?\n]{0,50}\b(?:increased|raised)[^.!?\n]{0,50}\bfor\s+(?:(?:the\s+)?past\s+)?(\d{2,3})\s+consecutive\s+years/i);
  if(!match)continue;
  const years=Number(match[1]);if(years<20||years>150)continue;
  const sentences=paragraph.trim().split(/(?<=[.!?])\s+/);
  const index=sentences.findIndex(s=>s.includes(match[0]));
  const quote=sentences.slice(Math.max(0,index-2),index+2).join(' ').trim();
  const dateText=sentences.slice(Math.max(0,index-1),index+1).join(' ');
  const disclosedYears=[...dateText.matchAll(/\bin (20\d{2})\b/g)].map(m=>Number(m[1])).filter(y=>y<=Number(source.filed.slice(0,4)));
  const year=disclosedYears.length?Math.max(...disclosedYears):Number(source.period.slice(0,4));
  return [{id:'dividend-growth',kind:'dividend-growth',theme:'Owners and management',tone:'green',severity:90,label:`Dividend raised ${years} consecutive years`,why:'The filing documents a sustained record of increasing cash distributions to owners.',question:'Can earning power keep funding these distributions?',series:[[year,years]],unit:'years',evidence:[{quote,url:source.url,filed:source.filed,section:source.section}],basis:'computed'}];
 }
 return [];
}

import type {Analysis} from '../types';
import {trustedReading} from '../judgement/apply';
import judgementTrust from '../judgement/trust.json';
export function pricingStrength(analysis:Analysis):BusinessFlag[]{
 const r=analysis.judgement?.business.find(r=>r.id==='pricing'&&r.value==='demonstrated'&&r.confidence>=.9&&trustedReading(r,judgementTrust));
 if(!r?.evidence)return [];
 const inflation=/inflation|inflationary/i.test(r.evidence.quote);
 return [{id:'pricing-resilience',kind:'pricing-resilience',theme:'Capital cycle',tone:'green',severity:85,label:inflation?'Higher prices held up through inflation':'Higher prices held up alongside demand',why:'The filing explicitly describes higher realised prices with maintained or growing sales volume.',question:'Can higher prices preserve customer demand through the next difficult year?',series:[],unit:'percent',evidence:[r.evidence],basis:'filing',extraction:'judgement',version:r.version,confidence:r.confidence}];
}
