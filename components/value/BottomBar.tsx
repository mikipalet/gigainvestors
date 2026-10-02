import { SearchTrigger } from '@/components/Search';
import { AboutMethod } from './AboutMethod';
import { getMeta, getDossier } from '@/lib/value/store';
import { CALIBRATION } from '@/lib/value/calibration';
import { ValueLink } from './ValueLink';
export async function BottomBar(){
 const [meta, calibration] = await Promise.all([getMeta(), Promise.all(CALIBRATION.filter(c=>c.expect!=='exception').map(async c=>{const d=await getDossier(c.id);return d?{id:c.id,name:d.company.name,expected:c.expect==='quality',tests:Object.values(d.tests).filter(t=>t.key!=='price').map(t=>t.result),why:c.why}:null;}))]);
 return <nav className="value-dock" aria-label="Time travel and tools"><div id="value-timeline"><ValueLink className="dock-home" href="/">← Companies</ValueLink></div><div className="dock-tools"><div id="value-market"/><SearchTrigger value/><AboutMethod meta={meta} calibration={calibration.filter(c=>c!==null)}/><a href="https://gigainvestors.com">Portfolios ↗</a></div></nav>}
