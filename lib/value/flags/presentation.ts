import {publicBusiness} from './public';
import {validShortText} from '../judgement/short-text';
import type {ShortTextAnswer} from '../judgement/short-text';
import type {Analysis} from '../types';
import type {Evidence} from '../judgement/types';
import type {Relationship} from './types';
import {validEvidence} from './trust';
export const readingCopy:Record<string,string>={brand:'Customers recognise and trust the brand.',network:'The network becomes more useful as it grows.',switching:'Changing providers would disrupt customers’ work.',cost:'Lower costs give it room to compete.',regulation:'Permission to operate limits new competitors.',scale:'Its reach gives it an advantage over smaller rivals.',demonstrated:'Higher prices have held up alongside demand.',pressured:'Higher prices have cost it demand.',concentrated:'A small group of customers or suppliers matters.',diversified:'Sales are spread across customers.',admission:'Management acknowledges a shortcoming.',buybacks:'Management is returning cash through buybacks.',dividends:'Management is returning cash through dividends.',acquisitions:'Management is buying other businesses.',reinvestment:'Management is putting money back into the business.',mixed:'Management splits cash between several uses.'};
export interface BusinessLine {answer?:ShortTextAnswer;id:string;text:string;priority:number;why:string;tone?:'red'|'green'|'neutral';evidence?:Evidence;kind:'reading'|'flag'|'relationship'|'description'}
export function relationLabel(r:Relationship,owner:string):string{
 if(r.type==='customer')return r.from===owner?'customer':'supplier';
 if(r.type==='stake')return r.from===owner?'investment':'investor';
 if(r.type==='guarantee')return r.from===owner?'guarantee':'guarantor';
 if(r.type==='subsidiary')return r.from===owner?'subsidiary':'parent';
 return r.type.replace('-',' ');
}
export function relationAmount(r:Relationship,owner?:string):string {
 if(r.percent!=null)return `${Math.round(r.percent*100)}% ${owner&&r.from!==owner&&['revenue','backlog'].includes(r.metric??'')?`of ${r.name} ${r.metric}`:r.metric??''}`;
 if(r.amount!=null)return `${r.currency??''} ${(r.amount/(r.amount>=1e9?1e9:1e6)).toFixed(1).replace(/\.0$/,'')}${r.amount>=1e9?'bn':'m'}`;
 return '';
}
/** Only independently supported short answers reach the page; quotes stay in the drawer. */
export function businessLines(a:Analysis):BusinessLine[]{
 const depth=publicBusiness(a.businessDepth,a);
 const readings=(a.businessOverview??[]).filter(l=>l.kind!=='flag'&&l.kind!=='relationship'&&!/^(?:Repurchases its own shares|Pays dividends to shareholders|Sells apps (?:and digital content )?through Google Play)\./.test(l.text)).filter(l=>l.answer?.producer==='jev-choice'&&validEvidence(l.answer.evidence)&&l.answer.support>=.8&&l.text===l.answer.text&&validShortText(l.text,l.answer.evidence.quote));
 const flags:BusinessLine[]=(depth?.flags??[]).filter(f=>f.tone!=='neutral').map(f=>({id:f.id,text:f.label,priority:f.severity,why:f.why,tone:f.tone,evidence:f.evidence[0],kind:'flag'}));
 const relation=[...(depth?.relationships??[])].sort((x,y)=>(y.percent??0)-(x.percent??0)||(y.amount??0)-(x.amount??0))[0];
 const links:BusinessLine[]=relation?[{id:'relationships',text:`${relation.name} · ${relationLabel(relation,a.company.id)}${relationAmount(relation,a.company.id)?` · ${relationAmount(relation,a.company.id)}`:''}`,priority:relation.amount!=null||relation.percent!=null?82:55,why:relation.evidence[0].quote,evidence:relation.evidence[0],kind:'relationship'}]:[];
 const candidates=[...readings.map(l=>({...l,priority:l.id==='reading-business'?100:/\d/.test(l.text)?80:Math.min(l.priority,45)})),...flags,...links];
 return deduplicateBusinessLines(candidates).slice(0,6);
}

/** Specific numbers/streaks displace generic statements about the same action. */
export function deduplicateBusinessLines(lines:BusinessLine[]):BusinessLine[]{
 const topic=(text:string)=>/\bdividends?\b/i.test(text)?'dividend':/\b(?:buybacks?|repurchas(?:e|es|ed|ing))\b/i.test(text)?'buyback':null;
 const words=(text:string)=>new Set(text.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>3));
 const specificity=(line:BusinessLine)=>/\d/.test(line.text)?2:line.kind==='flag'?1:0;
 const ranked=[...lines].sort((a,b)=>specificity(b)-specificity(a)||b.priority-a.priority||a.id.localeCompare(b.id));
 const selected:BusinessLine[]=[];
 for(const line of ranked){
  const set=words(line.text);
  if(selected.some(other=>{
   if(other.text===line.text)return true;
   if(topic(line.text)&&topic(line.text)===topic(other.text)&&(!/\d/.test(line.text)||line.text.toLowerCase()===other.text.toLowerCase()))return true;
   const theirs=words(other.text),overlap=[...set].filter(w=>theirs.has(w)).length;
   return Math.min(set.size,theirs.size)>=3&&overlap/Math.min(set.size,theirs.size)>=.8;
  }))continue;
  selected.push(line);
 }
 return selected.sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));
}
