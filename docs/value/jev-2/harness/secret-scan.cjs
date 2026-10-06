const fs=require('node:fs'),path=require('node:path'),dotenv=require('dotenv');
const root=process.env.PUBFIX_ROOT,values=new Set();
for(const file of [path.join(root,'corpus/.env.local'),path.join(root,'corpus/.env'),path.join(require('node:os').homedir(),'value-corpus/.env.local')]){
 if(!fs.existsSync(file))continue;
 for(const [key,value] of Object.entries(dotenv.parse(fs.readFileSync(file))))if(/TOKEN|SECRET|PASSWORD|API_KEY/.test(key)&&value.length>=8)values.add(value);
}
for(const [key,value] of Object.entries(process.env))if(/TOKEN|SECRET|PASSWORD|API_KEY/.test(key)&&value.length>=8)values.add(value);
let count=0;const findings=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
 const file=path.join(dir,entry.name);
 if(entry.isDirectory())walk(file);
 else if(entry.isFile()&&!file.endsWith('.png')){
  count++;const text=file.endsWith('.gz')?require('node:zlib').gunzipSync(fs.readFileSync(file)).toString('utf8'):fs.readFileSync(file,'utf8');
  if([...values].some(v=>text.includes(v)))findings.push(file);
 }
}}
walk('docs/value/jev-2');
walk('lib/value');
walk('scripts/value');
const result={filesChecked:count,knownSecretValuesChecked:values.size,findings};
fs.writeFileSync(path.join(root,'evidence/secret-scan.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({filesChecked:count,knownSecretValuesChecked:values.size,findingCount:findings.length}));
if(findings.length)process.exitCode=1;
