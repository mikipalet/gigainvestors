import sharp from 'sharp';
import {readFileSync,writeFileSync} from 'node:fs';
const rows=JSON.parse(readFileSync('evidence-2/review-candidates.json','utf8'));
async function main(){
for(let start=0;start<rows.length;start+=10){
 const chunk=rows.slice(start,start+10),layers:sharp.OverlayOptions[]=[];
 for(const [n,r]of chunk.entries()){
  const bytes=Buffer.from(JSON.parse(readFileSync(`acquisition/enrichment-v7/logos/assets/${r.record.asset}.json`,'utf8')).data,'base64');
  const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  layers.push({input:Buffer.from(`<svg width="900" height="170"><rect width="900" height="170" fill="#fafafa"/><rect x="580" width="320" height="170" fill="#18202c"/><text x="10" y="24" font-size="16">${esc(r.id+' '+r.name)}</text><text x="10" y="47" font-size="13">${esc(r.record.source)}</text></svg>`),top:n*170,left:0});
  for(const [left,size]of [[300,110],[450,26],[600,110],[760,26]])layers.push({input:await sharp(bytes).resize(size,size,{fit:'inside'}).png().toBuffer(),left,top:n*170+55});
 }
 await sharp({create:{width:900,height:chunk.length*170,channels:4,background:'#fff'}}).composite(layers).png().toFile(`evidence-2/review-${start}.png`);
}
}main();
