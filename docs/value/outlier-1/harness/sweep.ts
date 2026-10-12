import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {modelReturn} from '../../../../lib/value/return-model';
const repo=process.argv[2]??`${process.env.HOME}/value-corpus/publish-repo`;
const analysis=process.argv[3]??`${process.env.HOME}/value-corpus/analysis`;
const out:any[]=[];
for(const f of readdirSync(`${repo}/index`)){
 if(f==='default.json')continue;
 const rows=JSON.parse(readFileSync(`${repo}/index/${f}`,'utf8'));
 const pf=`${repo}/prices/${f}`;const prices=existsSync(pf)?JSON.parse(readFileSync(pf,'utf8')):{};
 for(const r of rows){
  const p=prices[r.id]?.[0];const v=r.v?.[1];
  const model=r.buyReturnInputs?.model;
  const er=model&&p?modelReturn(model,p):null;
  let oeps:number|null=null;
  const af=`${analysis}/${r.id}.json`;
  let method=null,da=null;
  if(existsSync(af)){const a=JSON.parse(readFileSync(af,'utf8'));const val=a.valuation;method=val?.method;
   if(val?.method==='owner_earnings'&&val.shares>0)oeps=val.normalized/val.shares*(val.perShareTrading?.fxRate??1);}
  const pv=p&&v?v/p:null;
  const hit=(pv!==null&&pv>4)||(er!==null&&er>0.4)||(oeps!==null&&p&&oeps/p>0.5);
  out.push({hit:!!hit,id:r.id,n:r.n,c:r.c,k:r.k,b:r.b,t:r.t,pr:r.pr,price:p,cur:r.cur,v,pv:pv&&+pv.toFixed(2),er:er&&+er.toFixed(3),oeYield:oeps&&p?+(oeps/p).toFixed(2):null,method,st:r.st});
 }
}
out.sort((a,b)=>(b.pv??0)-(a.pv??0));
console.log(JSON.stringify(out));
