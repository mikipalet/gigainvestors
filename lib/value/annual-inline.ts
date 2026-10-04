import {parseDocument} from 'htmlparser2';
import type {CompanyFacts} from './completeness/second-sources';
type Node={type:string;name?:string;data?:string;attribs?:Record<string,string>;children?:Node[]};
const nodes=(root:Node):Node[]=>{const result:Node[]=[],stack=[root];while(stack.length){const n=stack.pop()!;result.push(n);stack.push(...(n.children??[]));}return result;};
const text=(root:Node)=>nodes(root).filter(n=>n.type==='text').reverse().map(n=>n.data??'').join('').trim();
/** Preserve original tags/units/scales; dimensioned facts are excluded unless the
 * caller supplies an exact, reviewed share-class/tracking-group dimension set. */
export function annualInlineFacts(html:string,meta:{url:string;filed:string;form:string;shareDimensions?:Record<string,string>;revenueConcept?:string;revenueComponents?:string[];revenueDimensions?:Record<string,string>}):CompanyFacts{
 const all=nodes(parseDocument(html) as Node),contexts=new Map<string,{start?:string;end:string;dimensions:Record<string,string>}>(),units=new Map<string,string>();
 for(const n of all){
  if(n.name?.endsWith(':context')&&n.attribs?.id){
   const children=nodes(n),end=children.find(c=>/:(enddate|instant)$/.test(c.name??'')),start=children.find(c=>c.name?.endsWith(':startdate'));
   if(!end||children.some(c=>c.name?.endsWith(':typedmember')))continue;
   const dimensions=Object.fromEntries(children.filter(c=>c.name?.endsWith(':explicitmember')).map(c=>[c.attribs?.dimension??'',text(c)]));
   contexts.set(n.attribs.id,{start:start?text(start):undefined,end:text(end),dimensions});
  }
  if(n.name?.endsWith(':unit')&&n.attribs?.id){
   const children=nodes(n),measures=children.filter(c=>c.name?.endsWith(':measure')).reverse().map(text);
   if(measures.length===1)units.set(n.attribs.id,measures[0].replace(/^(iso4217|xbrli):/,''));
   if(children.some(c=>c.name?.endsWith(':divide'))&&measures.length===2)units.set(n.attribs.id,measures.map(s=>s.replace(/^(iso4217|xbrli):/,'')).join('/'));
  }
 }
 const facts:CompanyFacts['facts']={};
 for(const n of all){
  if(n.name!=='ix:nonfraction'||!n.attribs)continue;
  const a=n.attribs,[ns,tag]=(a.name??'').split(':'),ctx=contexts.get(a.contextref),unit=units.get(a.unitref);
  if((!['us-gaap','ifrs-full'].includes(ns)&&a.name!==meta.revenueConcept&&!meta.revenueComponents?.includes(a.name))||!tag||!ctx||!unit||a['xsi:nil']==='true')continue;
  if(a.name===meta.revenueConcept&&meta.revenueDimensions){
   if(JSON.stringify(Object.entries(ctx.dimensions).sort())!==JSON.stringify(Object.entries(meta.revenueDimensions).sort()))continue;
  }else if(Object.keys(ctx.dimensions).length){
   if(!/WeightedAverage.*(?:Shares|Units)/.test(tag)||!meta.shareDimensions||JSON.stringify(Object.entries(ctx.dimensions).sort())!==JSON.stringify(Object.entries(meta.shareDimensions).sort()))continue;
  }
  const value=text(n).replace(/[,\s]/g,'');if(!/\d/.test(value))continue;
  const val=Number(value.replace(/[()]/g,''))*10**Number(a.scale??0)*(a.sign==='-'||value.startsWith('(')?-1:1);
  if(!Number.isFinite(val))continue;
  const data={start:ctx.start,end:ctx.end,val,filed:meta.filed,form:meta.form,accn:meta.url.split('/').at(-2)};
  facts[ns]??={};facts[ns][tag]??={units:{}};(facts[ns][tag].units[unit]??=[]).push(data);
 }
 return {facts};
}
