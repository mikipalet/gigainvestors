import type {MemoLine} from '../owner-memo';
/** Deterministic first gate. Filing statements additionally need typed semantic
 * support checks; this is deliberately not advertised as a grammar parser. */
export function validMemoAnswer(answer:string):boolean {
 const s=answer.trim();
 if(/^(?:For example|For instance|However|Furthermore|Moreover|In addition|Additionally|Also|Therefore|Nevertheless|Consequently|As a result)\b/i.test(s))return false;
 if(!s||s.split(/\s+/).length>18||/[\r\n]/.test(s)||!/[.!?]$/.test(s)||s.split(';').length>2)return false;
 if(/not enough data|not reported|unavailable|unclear|not tested|verify|being checked|not supplied|informational only|available evidence/i.test(s))return false;
 if(/Risk Factors\s+\d|\b(?:organic (?:growth|sales)|cost of risk|equitable relief|redress the alleged|hedged fixed-rate|interdependency|ad valorem|de minimis)\b|growth capex|incremental return|\bROIC\b|\bNAV\b|price by|\b(?:OG|RIG|ARPU|bps|CAGR|EBITDA|OEMs?|RoTE|CET1|GAAP)\b|^\d+\s+[A-Z]|^There are legislative proposals|^\d+(?:\.\d+)?%|\b(?:and|of|for|with|including|despite|the|its)[.!?]$/i.test(s))return false;
 // Complete templates and filing sentences must contain an actual predicate.
 if(!/\b(?:is|are|was|were|has|have|had|hold|holds|own|owns|earn|earns|earned|keeps|kept|brings|bring|comes|come|trust|benefit|restrict|lowers|pay|operates|gets|sells|sell|provides|makes|generates|generated|held|ranged|rose|fell|grew|shrank|grow|shrink|paid|pays|spends|spent|reinvests|bought|repurchased|assumes|requires|would|could|may|can|face|faces|threaten|threatens|depends|depend|competes|compete|increased|decreased|declined|accounted|accounts|represents|represented|remained|remain|include|includes|expect|expects|expose|exposes|exposed|involves|recorded|charged|set|raised|lifted|added|cut|value|cost|costs|fell|rose|lost|lost|exceed|exceeds)\b/i.test(s))return false;
 for(const m of s.matchAll(/(-?\d+(?:\.\d+)?)%/g)){
  const n=Number(m[1]),before=s.slice(Math.max(0,m.index!-30),m.index);
  if(/(?:earn|return|margin|own|capital)/i.test(s)&&n>100&&!/over\s*$/.test(before))return false;
  if(n< -100)return false;
  if(/insiders own/i.test(s)&&(n<0||n>100))return false;
 }
 return true;
}
export function validMemoLine(line:MemoLine):boolean {
 if(line.literal){
  const {text,source,date}=line.literal;
  if(![3,6].includes(line.question)||!text||!source||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)||!Number.isFinite(Date.parse(date)))return false;
  const label=new Date(date.slice(0,7)+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
  return line.answer===`"${text}" (${source}, ${label})`&&line.answer.split(/\s+/).length<=18&&!/[\r\n]/.test(text)&&line.evidence.some(e=>e.quote===text&&e.filed===date&&/^https:\/\//.test(e.url));
 }

 if(line.question===6&&!/threat|risk|depend|relies|rely|could|may|lawsuit|litigat|fine|provision|claims?|largest customers|major customers|antitrust|restrict|tariffs|set aside|commission|compete|concentrat|accounts? for|represented|brings?/i.test(line.answer))return false;
 if(line.question===6&&(/(?:divestment|sale of).*?(?:completed|expected to complete)|competes? with (?:endpoint|solution|service|other|a range|providers)|debt obligations could adversely affect|Google was found to have violated/i.test(line.answer)))return false;
 return Number.isInteger(line.question)&&line.question>=1&&line.question<=7&&validMemoAnswer(line.answer)
  &&line.evidence.length>0&&line.evidence.every(e=>/^https:\/\//.test(e.url)&&!!e.quote.trim());
}

/** Shared financial claims must agree with the very series shown in the dossier.
 * Filing-specific ownership, pricing and risks still require their own evidence. */
export function consistentMemoLines(a:import('../types').Analysis,lines:MemoLine[]):MemoLine[]{
 const points=(key:string)=>(a.tests?.moat?.series?.[key]??[]).filter((p):p is [number,number]=>typeof p[1]==='number'&&Number.isFinite(p[1]));
 const margins=points('grossMargin'),lastMargin=margins.at(-1),capital=(a.tests?.moat?.series?.[a.company.kind==='operating'?'roic':'roe']??[]).slice(-10).filter((p):p is [number,number]=>typeof p[1]==='number'&&Number.isFinite(p[1])).map(p=>p[1]).sort((a,b)=>a-b);
 const midpoint=Math.floor(capital.length/2),typical=capital.length?(capital[midpoint]+capital[Math.floor((capital.length-1)/2)])/2:null;
 const agrees=(shown:number,actual:number)=>Math.abs(shown-100*actual)<=.051;
 const kept=lines.map(line=>{
  if(line.question!==6||line.literal)return line;
  const answer=line.answer.replace(/^(?:For example|For instance|However|Furthermore|Moreover|In addition|Additionally|Also|Therefore|Nevertheless|Consequently|As a result),?\s+/i,'');
  return {...line,answer:answer.charAt(0).toUpperCase()+answer.slice(1)};
 }).filter(line=>{
  if(!validMemoLine(line))return false;
  if(line.question===1&&/after product costs/.test(line.answer)&&lastMargin){
   const margin=line.answer.match(/keeps ([\d.]+) cents/i);
   if(margin&&!agrees(Number(margin[1]),lastMargin[1]))return false;
  }
  if(line.question===2&&typical!==null){
   const value=line.answer.match(/(?:it )?earns (over )?([\d.]+)% on/i);
   if(value&&(value[1]?typical<=1:!agrees(Number(value[2]),typical)))return false;
  }
  return true;
 });
 const marginLine=kept.find(l=>l.question===1&&/after product costs/.test(l.answer));
 const margin=marginLine?.answer.match(/keeps ([\d.]+) cents/i);
 return kept.filter(line=>{
  if(line.question!==3||!margin||!marginLine)return true;
  const stated=line.answer.match(/gross margin (?:rose|fell|increased|decreased)(?:[^;]*?)to ([\d.]+)%/i);
  const sameFiling=line.evidence.some(e=>marginLine.evidence.some(other=>other.url===e.url));
  return !stated||!sameFiling||Math.abs(Number(stated[1])-Number(margin[1]))<=.051;
 });
}
