// Report counts only. Never print credential values or process arguments.
const fs=require('node:fs'),path=require('node:path'),dotenv=require('dotenv');
const root='/Users/miki/data/regress/run2',values=new Set();
for(const file of ['/Users/miki/GitHub/superinvestors-wt/value-daily/.env.local','/Users/miki/value-corpus/.env.local','/Users/miki/data/regress/repo/.env.local']){
 if(!fs.existsSync(file))continue;
 for(const [key,value]of Object.entries(dotenv.parse(fs.readFileSync(file))))if(/TOKEN|SECRET|PASSWORD|API_KEY/i.test(key)&&value.length>=8)values.add(value);
}
const files=new Set();
const walk=(dir)=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(entry.isFile()&&!p.endsWith('.png'))files.add(p);}};
for(const dir of ['docs/value/regress-2','tests/unit/value','lib/value','scripts/value'])walk(dir);
walk(root+'/evidence');
const manifest='/Users/miki/data/regress/release-bundle/manifest.json';
if(fs.existsSync(manifest))for(const rel of Object.keys(JSON.parse(fs.readFileSync(manifest)).overlayFiles))files.add(root+'/corpus/'+rel);
const needles=[...values].map(v=>Buffer.from(v)),overlap=Math.max(1,...needles.map(n=>n.length));let checked=0,matches=0;
for(const file of files){
 const fd=fs.openSync(file,'r'),chunk=Buffer.alloc(1024*1024);let tail=Buffer.alloc(0),found=false,n;
 while((n=fs.readSync(fd,chunk,0,chunk.length,null))){const text=Buffer.concat([tail,chunk.subarray(0,n)]);if(needles.some(v=>text.includes(v)))found=true;tail=Buffer.from(text.subarray(Math.max(0,text.length-overlap)));}
 fs.closeSync(fd);checked++;if(found)matches++;
}
const result={filesChecked:checked,knownSecretValuesChecked:values.size,findingCount:matches};
fs.writeFileSync(root+'/evidence/secret-scan.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(matches)process.exitCode=1;
