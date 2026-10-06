export type RetainedNumber={path:string;value:number};
const numeric=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
/** Retain published observations lost to incomplete inputs or a shorter window.
 * Period keys, not array positions, bind history. Fresh values and verdicts win.
 * A suppressed whole valuation is never rebuilt from disconnected old cells. */
export function retainPublishedNumbers(previous:any,current:any,justifiedNulls=new Set<string>()):RetainedNumber[]{
 const retained:RetainedNumber[]=[];
 const visit=(old:any,next:any,path:string):any=>{
  if(justifiedNulls.has(path))return next;
  if(numeric(old)&&(next===null||next===undefined)){retained.push({path,value:old});return old;}
  if(old&&typeof old==='object'&&!Array.isArray(old)){
   if(next===null||next===undefined){
    if(path==='valuation')return next;
    const before=retained.length,copy=visit(old,{},path);
    return retained.length>before?{...structuredClone(old),...copy}:next;
   }
   if(typeof next==='object'&&!Array.isArray(next))for(const [key,value]of Object.entries(old)){
    const result=visit(value,next[key],path?`${path}.${key}`:key);
    if(result!==undefined)next[key]=result;
   }
  }else if(Array.isArray(old)){
   if(next===null||next===undefined)next=[];
   if(!Array.isArray(next))return next;
   const pair=old.length&&old.every(v=>Array.isArray(v)&&v.length===2&&['number','string'].includes(typeof v[0]));
   const fiscal=old.length&&old.every(v=>v&&typeof v==='object'&&!Array.isArray(v)&&'fy'in v);
   if(pair||fiscal){
    const key=(v:any)=>pair?v[0]:v.fy,byKey=new Map(next.map(v=>[key(v),v]));
    for(const row of old){
     const k=key(row),prior=byKey.get(k),p=`${path}[${k}]`;
     if(pair){const value=visit(row[1],prior?.[1],p);if(value!==undefined){if(prior)prior[1]=value;else next.push([k,value]);}else if(!prior&&row[1]===null){next.push([k,null]);if(numeric(k))retained.push({path:p+'.period',value:k});}}
     else{const value=visit(row,prior,p);if(!prior&&value!==undefined)next.push(value);}
    }
    next.sort((a:any,b:any)=>String(key(a)).localeCompare(String(key(b))));
   }
  }
  return next;
 };
 for(const key of ['tests','valuation','series','valueHistory'])if(previous[key]!==undefined){const result=visit(previous[key],current[key],key);if(result!==undefined)current[key]=result;}
 return retained;
}
