import type {Analysis} from '../types';
import type {Evidence} from '../judgement/types';
import type {Relationship} from './types';
import {validEvidence} from './trust';
export const readingCopy:Record<string,string>={brand:'Customers recognise and trust the brand.',network:'The network becomes more useful as it grows.',switching:'Changing providers would disrupt customers’ work.',cost:'Lower costs give it room to compete.',regulation:'Permission to operate limits new competitors.',scale:'Its reach gives it an advantage over smaller rivals.',demonstrated:'Higher prices have held up alongside demand.',pressured:'Higher prices have cost it demand.',concentrated:'A small group of customers or suppliers matters.',diversified:'Sales are spread across customers.',admission:'Management acknowledges a shortcoming.',buybacks:'Management is returning cash through buybacks.',dividends:'Management is returning cash through dividends.',acquisitions:'Management is buying other businesses.',reinvestment:'Management is putting money back into the business.',mixed:'Management splits cash between several uses.'};
export interface BusinessLine {id:string;text:string;priority:number;why:string;tone?:'red'|'green';evidence?:Evidence;kind:'reading'|'flag'|'relationship'|'description'}
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
/** One ranked budget, never a second row of chips or a separate connections section. */
export function businessLines(a:Analysis):BusinessLine[]{
 const lines:BusinessLine[]=[];
 const flags=a.businessDepth?.flags.filter(f=>f.evidence.length&&f.evidence.every(validEvidence))??[];
 const counts={red:0,green:0};
 for(const f of [...flags].sort((x,y)=>y.severity-x.severity))if(counts[f.tone]++<3)lines.push({id:f.id,text:f.label,priority:f.severity,why:f.why,tone:f.tone,evidence:f.evidence[0],kind:'flag'});
 const relations=(a.businessDepth?.relationships??[]).filter(r=>r.evidence.length&&r.evidence.every(validEvidence)).sort((x,y)=>(y.percent??0)-(x.percent??0)||(y.amount??0)-(x.amount??0));
 if(relations.length){
  const relevant=relations.filter(r=>['customer','supplier','guarantee','licensing'].includes(r.type)),selected=(relevant.length?relevant:relations).slice(0,2);
  lines.push({id:'relationships',text:`${relevant.length?'Depends on':'Connections'}: ${selected.map(r=>`${r.name} (${r.metric==='backlog'?'backlog':relationLabel(r,a.id)})`).join(', ')}`,priority:selected.some(r=>r.metric==='revenue'||r.metric==='backlog')?82:62,why:'Relationships disclosed in filings; a name here does not establish the full extent of an economic dependency.',kind:'relationship'});
 }
 const priorities:Record<string,number>={business:48,moat:72,pricing:73,allocation:52,candor:50,risk:58,concentration:54,competitors:42};
 for(const r of a.judgement?.business??[]){
  if(!validEvidence(r.evidence))continue;
  const text=readingCopy[r.value]??(r.id==='business'?a.company.description?.split(/(?<=\.)\s+(?=[A-Z])/)[0]:null);
  if(text)lines.push({id:`reading-${r.id}`,text,priority:priorities[r.id]??40,why:r.evidence.quote,kind:'reading',evidence:r.evidence});
 }
 if(!lines.some(l=>l.id==='reading-business')&&a.company.description)lines.push({id:'description',text:a.company.description.split(/(?<=\.)\s+(?=[A-Z])/)[0],priority:45,why:'Company description',kind:'description'});
 return lines.sort((x,y)=>y.priority-x.priority||x.id.localeCompare(y.id)).slice(0,6);
}
