import fs from 'node:fs';
const proof=JSON.parse(fs.readFileSync('docs/value/dedupe-2/publication-proof.json'));const rows=[];
const route=id=>'/s/'+id.replace(/\.US$/,'');
for(const {id,canonical} of proof.removed)for(const path of [route(id),'/s/'+id,'/value/'+id]){
 for(const q of ['', '?q=2025Q4'])for(const accept of ['text/html','text/markdown']){const response=await fetch('http://localhost:3047'+path+q,{redirect:'manual',headers:{accept}});const location=response.headers.get('location');
 rows.push({accept,path:path+q,status:response.status,location,pass:response.status===308&&location===route(canonical)+q});
}}
fs.writeFileSync('docs/value/dedupe-2/redirect-proof.json',JSON.stringify({requests:rows.length,failures:rows.filter(r=>!r.pass),rows},null,2)+'\n');console.log(JSON.stringify({requests:rows.length,failures:rows.filter(r=>!r.pass)}));

if(rows.some(r=>!r.pass))process.exitCode=1;
