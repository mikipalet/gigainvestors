// Exact background-only pixels; same paper RGB and viewport crop on both captures.
// No tile tint, bounding-box occupancy, or chart-area proxy is counted as content.
import sharp from 'sharp';
import {readFileSync,writeFileSync} from 'node:fs';
const [before,after,out]=process.argv.slice(2);
const a=JSON.parse(readFileSync(`${before}/report.json`)),b=JSON.parse(readFileSync(`${after}/report.json`));
async function empty(dir,row){const [width,height]=row.viewport.split('x').map(Number);const {data,info}=await sharp(`${dir}/${row.file}`).extract({left:0,top:0,width,height}).removeAlpha().raw().toBuffer({resolveWithObject:true});// Main fills the desktop viewport, including the shared bottom dock.
 const counts=new Map();for(let i=0;i<data.length;i+=info.channels){const key=`${data[i]},${data[i+1]},${data[i+2]}`;counts.set(key,(counts.get(key)??0)+1);}const [paper,count]=[...counts].sort((a,b)=>b[1]-a[1])[0];return {paper,empty:count/(info.width*info.height),pixels:info.width*info.height};}
const rows=[];for(const r of a.filter(r=>!r.viewport.startsWith('390')&&r.path!=='/')){const s=b.find(s=>s.path===r.path&&s.viewport===r.viewport&&s.state==='page');if(!s)continue;const old=await empty(before,r),now=await empty(after,s);if(old.paper!==now.paper)throw Error('Background changed');rows.push({viewport:r.viewport,path:r.path,before:old.empty,after:now.empty,reduction:1-now.empty/old.empty,paper:old.paper,pixels:old.pixels});}writeFileSync(out,JSON.stringify(rows,null,2));console.table(rows);
