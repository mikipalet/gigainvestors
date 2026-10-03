import {applyStory, type StoryReading, type StoryGrade, trustedStory} from '../../lib/value/price-story/publication';
import type {Dossier,PriceMap} from '../../lib/value/types';
export function targetedStory(d:Dossier,quote:PriceMap[string]|null,reading:StoryReading|null,grade:StoryGrade|null,now:string):Dossier {
 const candidate=applyStory(d,quote,reading,{price:trustedStory(grade,'price'),risk:trustedStory(grade,'risk')},now);
 const replacements=candidate.ownerMemo?.lines.filter(l=>(l.question===3||l.question===6)&&l.literal)??[];
 if(!d.ownerMemo||!replacements.length)return {...d,priceStory:candidate.priceStory};
 const byQuestion=new Map(replacements.map(l=>[l.question,l]));
 const lines=d.ownerMemo.lines.map(l=>byQuestion.get(l.question)??l);
 for(const line of replacements)if(!lines.some(l=>l.question===line.question))lines.splice(lines.findIndex(l=>l.question>line.question)<0?lines.length:lines.findIndex(l=>l.question>line.question),0,line);
 return {...d,priceStory:candidate.priceStory,ownerMemo:{...d.ownerMemo,lines}};
}
