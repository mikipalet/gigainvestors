import { AboutMethod } from './AboutMethod';
import { getMeta, getDossier } from '@/lib/value/store';
import { CALIBRATION } from '@/lib/value/calibration';
import {getIndex} from '@/lib/data';
import { BottomBarShell } from '../BottomBarShell';
export async function BottomBar(){
 const [meta, calibration] = await Promise.all([getMeta(), Promise.all(CALIBRATION.filter(c=>c.expect!=='exception').map(async c=>{const d=await getDossier(c.id);return d?{id:c.id,name:d.company.name,expected:c.expect==='quality',tests:Object.values(d.tests).filter(t=>t.key!=='price').map(t=>t.result),why:c.why}:null;}))]);
 const index=await getIndex();
 return <BottomBarShell timelineCodes={index?.investors.filter(i=>i.series.length>0).map(i=>i.code)??[]} investorCodes={index?.investors.map(i=>i.code)??[]} method={<AboutMethod meta={meta} calibration={calibration.filter(c=>c!==null)}/>}/>;
}
