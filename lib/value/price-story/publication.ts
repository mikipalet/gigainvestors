import {composePriceStory,pricingFallback,selectedMemo} from './compose';
import {SELECTION_VERSION,type Candidate,type Selection} from './selection';
import type {Dossier,PriceMap} from '../types';
export interface StoryReading {version:string;asOf:string;newsStatus:string;candidatesHash:string;price:Selection;risk:Selection;pricing:Selection;events:Candidate[]}
export interface StoryGrade {version:string;price:{n:number;accuracy:number};risk:{n:number;accuracy:number}}
export function trustedStory(grade:StoryGrade|null,kind?:'price'|'risk'):boolean{return !!grade&&grade.version===SELECTION_VERSION&&(kind?[grade[kind]]:[grade.price,grade.risk]).every(g=>g.n>=40&&g.accuracy>=.9);}
/** Runs inside publication after financial series and Q7 are finalized. */
export function applyStory(d:Dossier,quote:PriceMap[string]|null,reading:StoryReading|null,trusted:boolean|{price:boolean;risk:boolean},now:string):Dossier {
 const age=reading?Date.parse(now)-Date.parse(reading.asOf):Infinity;
 const fresh=reading?.version===SELECTION_VERSION&&age>=0&&age<=183*86400000;
 const priceTrusted=typeof trusted==='boolean'?trusted:trusted.price,riskTrusted=typeof trusted==='boolean'?trusted:trusted.risk;
 const accepted=priceTrusted&&fresh?reading:null;
 const priceStory=composePriceStory(d,quote,accepted?.price.selected??null,accepted?.events??[],now);
 const risk=riskTrusted&&fresh&&reading?.risk.selected?selectedMemo(reading.risk.selected):null;
 const pricing=(fresh&&reading?.pricing.selected?selectedMemo(reading.pricing.selected,reading.pricing.direction):null)??pricingFallback(d);
 const ownerMemo=d.ownerMemo?{...d.ownerMemo,lines:[...d.ownerMemo.lines.filter(l=>l.question!==3&&l.question!==6),...(pricing?[pricing]:[]),...(risk?[risk]:[])].sort((a,b)=>a.question-b.question)}:undefined;
 return {...d,priceStory,ownerMemo};
}
