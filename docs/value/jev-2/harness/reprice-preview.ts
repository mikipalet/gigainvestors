import {readdirSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {publishBalances} from '../../../../scripts/value/publish-balances';
import {publishViews} from '../../../../lib/value/publish-views';
const root=process.env.PUBFIX_ROOT!,files:Record<string,any>={};
const walk=(dir:string)=>{for(const e of readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(p.endsWith('.json'))files[path.relative(root+'/baseline-out',p)]=JSON.parse(readFileSync(p,'utf8'));}};walk(root+'/baseline-out');
const prices=Object.assign({},...Object.entries(files).filter(([f])=>f.startsWith('prices/')).map(([,v])=>v));
publishBalances(files,prices,{});publishViews(files);
for(const [f,v] of Object.entries(files)){const p=root+'/dry-run/'+f;mkdirSync(path.dirname(p),{recursive:true});writeFileSync(p,JSON.stringify(v)+'\n');}
console.log('Preview repriced; ordinary --out must still be rerun');
