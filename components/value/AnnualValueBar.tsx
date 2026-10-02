/** In-cell bars compare the annual observations in this column; the printed value is the accessible label. */
export function AnnualValueBar({value,values}:{value:number;values:Array<number|null>}){
 const finite=values.filter((n):n is number=>n!==null&&Number.isFinite(n)),min=Math.min(0,...finite),max=Math.max(0,...finite);
 if(max===min)return null;
 const x=(n:number)=>(n-min)/(max-min)*100;
 return <span className="annual-bar" aria-hidden="true"><i style={{left:`${Math.min(x(0),x(value))}%`,width:`${Math.abs(x(value)-x(0))}%`}}/><b style={{left:`${x(0)}%`}}/></span>;
}
