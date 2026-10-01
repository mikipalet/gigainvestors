import {validShortText} from '../judgement/short-text';
import type {ShortTextAnswer} from '../judgement/short-text';
import type {Analysis} from '../types';
import type {Evidence} from '../judgement/types';
import type {Relationship} from './types';
import {validEvidence} from './trust';
export const readingCopy:Record<string,string>={brand:'Customers recognise and trust the brand.',network:'The network becomes more useful as it grows.',switching:'Changing providers would disrupt customers’ work.',cost:'Lower costs give it room to compete.',regulation:'Permission to operate limits new competitors.',scale:'Its reach gives it an advantage over smaller rivals.',demonstrated:'Higher prices have held up alongside demand.',pressured:'Higher prices have cost it demand.',concentrated:'A small group of customers or suppliers matters.',diversified:'Sales are spread across customers.',admission:'Management acknowledges a shortcoming.',buybacks:'Management is returning cash through buybacks.',dividends:'Management is returning cash through dividends.',acquisitions:'Management is buying other businesses.',reinvestment:'Management is putting money back into the business.',mixed:'Management splits cash between several uses.'};
export interface BusinessLine {answer?:ShortTextAnswer;id:string;text:string;priority:number;why:string;tone?:'red'|'green';evidence?:Evidence;kind:'reading'|'flag'|'relationship'|'description'}
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
 return (a.businessOverview??[]).filter(l=>l.answer?.producer==='jev-choice'&&validEvidence(l.answer.evidence)&&l.answer.support>=.8&&l.text===l.answer.text&&validShortText(l.text,l.answer.evidence.quote)).slice(0,6);
}
