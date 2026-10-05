import {readdirSync,readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {iconHash} from '/Users/miki/GitHub/superinvestors-wt/value-logos/lib/value/logo-validation';
import {fillPublishedLogos} from '/Users/miki/GitHub/superinvestors-wt/value-logos/lib/value/logo-fill';
import {packView,unpackView} from '/Users/miki/GitHub/superinvestors-wt/value-logos/lib/value/browser-view';
const dir=process.env.HOME+'/data/value-logos/corpus/publish-repo';const files:Record<string,any>={};
for(const sub of ['index','dossiers'])for(const name of readdirSync(path.join(dir,sub)).filter(n=>n.endsWith('.json')))files[sub+'/'+name]=JSON.parse(readFileSync(path.join(dir,sub,name),'utf8'));
files['history/companies.json']=JSON.parse(readFileSync(path.join(dir,'history/companies.json'),'utf8'));
const missing=new Set(JSON.parse(readFileSync(process.env.HOME+'/data/value-logos/evidence/missing-before.json','utf8')).map((r:any)=>r.id));
for(const [file,data]of Object.entries(files)){
 if(file.startsWith('index/')||file==='history/companies.json')files[file]=data.map((r:any)=>missing.has(r.id)?{...r,lg:null}:r);
 if(file.startsWith('dossiers/'))files[file]=Object.fromEntries(Object.entries(data).map(([id,d]:[string,any])=>[id,missing.has(id)?{...d,company:{...d.company,logo:null}}:d]));
}
fillPublishedLogos(files);
const logos=new Map((Object.entries(files).filter(([f])=>/^index\/[A-Z]{2}\.json$/.test(f)).flatMap(([,rows])=>rows) as any[]).map(r=>[r.id,r.lg]));
const meta=JSON.parse(readFileSync(path.join(dir,'meta.json'),'utf8'));const changed=new Map();
const visit=(v:any):any=>{
 if(typeof v==='string'&&/^views\//.test(v)){
  if(changed.has(v))return changed.get(v);
  const data=JSON.parse(readFileSync(path.join(dir,v),'utf8'));const rows=unpackView(data).map(r=>missing.has(r.id)?{...r,lg:logos.get(r.id)??null}:r);
  const payload=packView(rows),text=JSON.stringify(payload),file='views/'+iconHash(Buffer.from(text)).slice(0,24)+'.json';files[file]=payload;changed.set(v,file);return file;
 }
 if(Array.isArray(v))return v.map(visit);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,visit(x)]));return v;
};meta.views=visit(meta.views);files['meta.json']=meta;
for(const [file,data]of Object.entries(files)){
 const dest=path.join(dir,file);mkdirSync(path.dirname(dest),{recursive:true});
 if(file.startsWith('logos/')&&existsSync(dest))continue;
 writeFileSync(dest,JSON.stringify(data)+'\n');
}
console.log({companies:logos.size,withLogo:[...logos.values()].filter(Boolean).length,withoutLogo:[...logos.values()].filter(v=>!v).length,views:changed.size});
