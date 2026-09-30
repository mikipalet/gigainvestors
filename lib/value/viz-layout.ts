/** Shared, deterministic geometry for the main-page visualization lab. */
export type AxisTick = {value:number;label:string};
const priceKnots=[[0,0],[.6,.04],[1,.20],[1.5,.46],[3,.72],[6,.88],[20,.98],[1000,1]];
const returnKnots=[[-1,0],[0,.22],[.1,.6],[.2,.85],[1,1]];
function piecewise(value:number,knots:number[][]){
 if(value<=knots[0][0])return 0;
 for(let i=1;i<knots.length;i++)if(value<=knots[i][0]){
  const [a,x]=knots[i-1],[b,y]=knots[i];return x+(value-a)/(b-a)*(y-x);
 }
 return 1;
}
export const pricePosition=(value:number)=>piecewise(value,priceKnots);
export const returnPosition=(value:number)=>piecewise(value,returnKnots);
export const priceTicks:AxisTick[]=[{value:.6,label:'0.6×'},{value:1,label:'Buy price'},{value:1.5,label:'1.5×'},{value:3,label:'3×'},{value:10,label:'10×+'}];
export const returnTicks:AxisTick[]=[{value:0,label:'0%'},{value:.1,label:'10% hurdle'},{value:.2,label:'20%'},{value:1,label:'100%+'}];
export const bands=[{label:'Buy now'},{label:'Within 20%'},{label:'20–50% above'},{label:'1.5–3×'},{label:'3×+'},{label:'Needs review'}];
/** Below-price companies without a published buy verdict must not enter Buy now. */
export function bandFor(ratio:number|null,buy:boolean,historical=false){
 if(historical&&buy)return 0;
 if(ratio===null||!Number.isFinite(ratio)||ratio<=0)return 5;
 if(ratio<=1)return buy?0:5;
 return ratio<=1.2?1:ratio<=1.5?2:ratio<=3?3:4;
}
export type SwarmPoint={id:string;x:number;width:number;height:number};
export type PackedPoint=SwarmPoint&{y:number;page:number};
/** Exact horizontal positions. Extra pages are explicit when fixed-size marks cannot fit.
 * Rectangle collision (rather than circle collision) also protects monograms and labels.
 * Sort is independent of fetch order, with larger labelled marks placed first.
 */
export function packSwarm(points:SwarmPoint[],height:number,gap=3):PackedPoint[]{
 const pages:PackedPoint[][]=[];
 for(const p of [...points].sort((a,b)=>b.width-a.width||a.x-b.x||a.id.localeCompare(b.id))){
  let placed=false;
  for(let page=0;!placed;page++){
   const peers=pages[page]??(pages[page]=[]);
   const nearby=peers.filter(q=>p.x<q.x+q.width+gap&&q.x<p.x+p.width+gap);
   const candidates=[0,...nearby.map(q=>q.y+q.height+gap)].sort((a,b)=>a-b);
   const y=candidates.find(y=>y+p.height<=Math.max(height,p.height)&&nearby.every(q=>y+p.height+gap<=q.y||q.y+q.height+gap<=y));
   if(y!==undefined){peers.push({...p,y,page});placed=true;}
  }
 }
 // Centre the packed stack vertically, without changing any relative positions.
 return pages.flatMap(page=>{const used=Math.max(0,...page.map(p=>p.y+p.height)),offset=Math.max(0,(height-used)/2);return page.map(p=>({...p,y:p.y+offset}));});
}
export function shortName(name:string,max=22){
 const clean=name.replace(/\b(corporation|incorporated|holdings?|company|limited|ltd|inc|corp|co|plc|s\.a\.|tbk)\b\.?/gi,'').replace(/[, .]+$/,'').replace(/\s+/g,' ').trim();
 if(clean.length<=max)return clean||name.slice(0,max);
 const words=clean.split(' ');let result='';for(const w of words){if((result+' '+w).trim().length>max)break;result=(result+' '+w).trim();}
 return result||clean.slice(0,max);
}

export function packFacets(points:(SwarmPoint&{facet:string})[],height:number,minLaneHeight=75,gap=3){
 const groups=[...new Set(points.map(p=>p.facet))].sort();
 const laneCount=Math.max(1,Math.min(groups.length,Math.floor(height/minLaneHeight)));
 const laneHeight=height/laneCount;
 const packed:PackedPoint[]=[],lanes:{name:string;y:number;height:number;page:number}[]=[];
 let offset=0;
 for(let start=0;start<groups.length;start+=laneCount){
  const names=groups.slice(start,start+laneCount);
  const layouts=names.map(name=>packSwarm(points.filter(p=>p.facet===name),Math.max(20,laneHeight-18),gap));
  const pages=Math.max(1,...layouts.flat().map(p=>p.page+1));
  for(let page=0;page<pages;page++)names.forEach((name,lane)=>lanes.push({name,y:lane*laneHeight,height:laneHeight,page:offset+page}));
  layouts.forEach((layout,lane)=>layout.forEach(p=>packed.push({...p,y:p.y+lane*laneHeight+18,page:p.page+offset})));
  offset+=pages;
 }
 return {points:packed,lanes};
}
