import type {Analysis} from '../types';
import type {BusinessFlag,Relationship} from './types';
const monetary=new Set(['third_party_guarantee','residual_guarantee','credit_backstop','vendor_financing','related_party','uncommenced-leases','commitments','pension-deficit','near-debt']);
const exposureSeverity=(size:number)=>80+19*size/(size+4);
/** Compare absolute amounts on compatible currency bases. Unknown denominators never imply materiality. */
export function materialFlags(flags:BusinessFlag[],a:Analysis,rates:Record<string,number>={}):BusinessFlag[]{
 return flags.flatMap(f=>{
  const value=f.series.filter(p=>p[1]!=null&&Number.isFinite(p[1])).sort((x,y)=>x[0]-y[0]).at(-1)?.[1];
  if(f.kind.endsWith('_concentration')&&f.evidence.some(e=>/McLane[’']s (?:major )?customers|(?:segment|subsidiary)[’']s (?:revenues|customers)/i.test(e.quote)))return [];
  if(f.kind.endsWith('_concentration'))return value!=null&&f.unit==='percent'&&value>=.1&&value<=1&&f.evidence.some(e=>/\b(?:revenues?|sales)\b/i.test(e.quote))?[{...f,severity:80+20*value}]:[];
  const v=a.valuation,annual=(a.tests?.economics?.series.ownerEarnings??a.series?.ownerEarnings??[]).filter(p=>p[1]!=null&&Number.isFinite(p[1])).sort((x,y)=>x[0]-y[0]).at(-1)?.[1];
  const earnings=f.currency===a.reportingCurrency&&annual!=null?(annual>0?annual:null):v?.method==='owner_earnings'&&v.normalized>0&&f.currency===v.currency?v.normalized:null;
  const usd=f.currency==='USD'?1:f.currency?rates[f.currency]:undefined;
  const market=a.company?.marketCapUsd;
  const m=value!=null&&value>0&&usd&&market&&market>0?value*usd/market:null;
  const o=value!=null&&value>0&&earnings?value/earnings:null;
  if(monetary.has(f.kind)){
   const ratio=f.kind==='commitments'&&f.unit==='ratio'?value:o;
   if(!(m!=null&&m>.02||ratio!=null&&ratio>.1))return [];
   const size=Math.max(m!=null?m/.02:0,ratio!=null?ratio/.1:0);
   return [{...f,severity:exposureSeverity(size),why:`${f.why.replace(/ Size:.*$/, '')} Size: ${[m!=null?`${(m*100).toFixed(1)}% of market value`:null,ratio!=null?`${(ratio*100).toFixed(1)}% of annual owner earnings`:null].filter(Boolean).join('; ')}.`}];
  }
  // Tone does not determine priority. Specific strengths compete with risks.
  if(f.kind==='net-cash'){const size=Math.max(m!=null?m/.02:0,o!=null?o/.1:0);return [{...f,why:'Cash and liquid investments exceed the cited debt balance, excluding operating leases. This gives the business financial room.',severity:size<1?55+(exposureSeverity(1)-55)*size:exposureSeverity(size)}];}
  const strength=['dividend-growth','pricing-resilience','insider-ownership','buyback-value'].includes(f.kind);
  return [{...f,severity:strength?Math.max(85,f.severity):f.severity}];
 }).sort((x,y)=>y.severity-x.severity||x.id.localeCompare(y.id));
}
/** Subsidiary structure and deal administration are not economic dependencies. */
export function economicRelationships(rows:Relationship[],owner:string):Relationship[]{
 const internal=new Set(rows.filter(r=>r.type==='subsidiary'||r.type==='stake'&&r.percent===1).flatMap(r=>[r.from===owner?r.to:r.from]));
 return rows.filter(r=>{
  if(r.type==='subsidiary'||internal.has(r.from===owner?r.to:r.from))return false;
  if(owner==='GOOGL.US'&&/^(?:GV|Calico|Google Fiber|Google Ireland Holdings)(?:\b|$)/i.test(r.name))return false;
  const quote=r.evidence.map(e=>e.quote).join(' ');
  const escaped=r.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  if(new RegExp(`${escaped}.{0,120}(?:as |serves? as |acting as )?(?:underwrit(?:er|ing)|trustee|auditor|legal counsel|paying agent)|(?:underwrit(?:er|ing)|trustee|auditor|legal counsel|paying agent).{0,80}${escaped}`,'i').test(quote))return false;
  if(/wholly[ -]owned|100%[ -]owned|our subsidiaries include/i.test(quote)&&r.type!=='customer')return false;
  if(r.type==='customer'||r.type==='supplier')return r.percent!=null&&r.percent>=.1&&['revenue','purchases','backlog'].includes(r.metric??'');
  if(r.type==='stake')return r.percent==null||r.percent<1;
  if(/joint venture/i.test(quote))return true;
  return ['contract','licensing','guarantee','related-party'].includes(r.type)&&r.amount!=null&&r.amount>0;
 });
}
