import type {SnapshotRow} from './time-travel';
export type HistoryPoint={year:number;ratio:number|null;buy:boolean};
export type LabHistory=Record<string,HistoryPoint[]>;
export const dropToBuy=(ratio:number|null)=>ratio===null?'Price unavailable':ratio<=1?'At buy price':`needs −${Math.round((1-1/ratio)*100)}%`;
export function historyRatio(row:SnapshotRow){
 const p=row[5];
 return p?.price!=null&&p.price>0&&p.buyPrice!=null&&p.buyPrice>0?p.price/p.buyPrice:null;
}
export const radialRadius=(ratio:number,unit:number)=>ratio*unit;
export const SECTORS=['Technology','Communication Services','Consumer Cyclical','Consumer Defensive','Healthcare','Financial Services','Industrials','Basic Materials','Energy','Utilities','Real Estate','Other'];
export function sectorAngles(sector:string|null){
 const i=SECTORS.indexOf(sector??'Other');
 return (i<0?11:i)/12*Math.PI*2-Math.PI/2;
}
export function seriesPath(points:Array<{year:number;ratio:number|null}>,start:number,end:number,width:number,height:number){
 let connected=false;
 return points.filter(p=>p.year>=start&&p.year<=end).map(p=>{
  if(p.ratio===null){connected=false;return '';}
  const x=(p.year-start)/Math.max(1,end-start)*width,y=height-height*Math.min(4,Math.max(0,p.ratio))/4;
  const command=`${connected?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`;connected=true;return command;
 }).join(' ');
}
/** Labels may move; price endpoints never do. Callers cap count to available rows. */
export function spreadLabels<T extends {y:number}>(points:T[],top:number,bottom:number,spacing:number){
 const sorted=[...points].sort((a,b)=>a.y-b.y);
 const placed=sorted.map(p=>({...p,labelY:Math.max(top,Math.min(bottom,p.y))}));
 for(let i=1;i<placed.length;i++)placed[i].labelY=Math.max(placed[i].labelY,placed[i-1].labelY+spacing);
 for(let i=placed.length-1;i>=0;i--)placed[i].labelY=Math.min(placed[i].labelY,i===placed.length-1?bottom:placed[i+1].labelY-spacing);
 return placed;
}
