import {ROUTES} from '../../lib/agent-api/config';
import {executeEndpoint,parseQuery} from '../../lib/agent-api/data';
import {schemas} from '../../lib/agent-api/schemas';
async function main(){
 for(const route of ROUTES){
  const pathname='/api/v1'+route.path.replace('{id}',route.id==='holdings'?'BRK':route.id==='ownership'?'KO':'KO.US').replace('{quarter}','2020Q1');
  const params=new URLSearchParams(route.id==='search'?'q=KO':route.id==='holdings'?'quarter=2020Q1':route.id==='export'?'limit=10000':'');
  const output=await executeEndpoint(route,pathname,parseQuery(params,route));
  const check=schemas[route.id].safeParse(output);
  if(!check.success){console.error(route.id,check.error.issues.slice(0,8).map(i=>({path:i.path,message:i.message})));process.exitCode=1;}
  else console.log('PASS '+route.path);
 }
}
main().catch(()=>{console.error('Published contract check failed to load data');process.exitCode=1;});
