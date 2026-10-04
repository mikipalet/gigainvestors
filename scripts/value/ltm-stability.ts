export type ReplayRow={id:string;quarter:string;annual:string;ltm:string};
/** Count an LTM-caused transition, including at the opening boundary, if its
 * actual verdict returns to the preceding verdict within two observations.
 * Annual-only transitions never count as LTM-driven changes. */
export function ltmFlapping(replay:ReplayRow[],keys:string[]){
 const flapping:Array<{id:string;test:string;quarter:string;reverted:string;from:string;to:string}>=[];
 for(const id of new Set(replay.map(r=>r.id))){
  const rows=replay.filter(r=>r.id===id).sort((a,b)=>a.quarter.localeCompare(b.quarter));
  for(let i=0;i<rows.length;i++)for(let k=0;k<keys.length;k++){
   const now=rows[i],from=i?rows[i-1].ltm[k]:now.annual[k];
   if(now.ltm[k]===from||now.ltm[k]===now.annual[k])continue;
   for(let j=i+1;j<=Math.min(i+2,rows.length-1);j++)if(rows[j].ltm[k]===from){flapping.push({id,test:keys[k],quarter:now.quarter,reverted:rows[j].quarter,from,to:now.ltm[k]});break;}
  }
 }
 return flapping;
}
