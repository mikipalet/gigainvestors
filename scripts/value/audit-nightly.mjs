import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const [live,out,report]=process.argv.slice(2);
const read=(root,file)=>JSON.parse(readFileSync(`${root}/${file}`,'utf8'));
const a=read(live,'history/index.json'),b=read(out,'history/index.json');
assert.equal(b.quarters.length,87);assert.deepEqual(b.quarters,a.quarters);
assert.deepEqual(b.perQuarter,a.perQuarter);assert.deepEqual(b.western.perQuarter,a.western.perQuarter);
for(const q of a.quarters)assert.deepEqual(read(out,`history/${q}.json`),read(live,`history/${q}.json`));
const meta=read(out,'meta.json');
for(const q of a.quarters){assert.ok(meta.views.quarters[q]);for(const file of [meta.views.quarters[q],...meta.views.quarterDeferred[q]])read(out,file);}
const dossiers=root=>Object.assign({},...readdirSync(`${root}/dossiers`).filter(f=>/\.json$/.test(f)).map(f=>read(root,`dossiers/${f}`)));
const x=dossiers(live),y=dossiers(out),sample=['7203.JP','ADBE.US','GOOGL.US','KO.US','JPM.US','WKL.AS'];
assert.deepEqual(Object.keys(y).sort(),Object.keys(x).sort());
const memoSample=sample.map(id=>{
 const lines=d=>d.ownerMemo.lines.map(l=>({question:l.question,answer:l.answer}));
 assert.deepEqual(lines(y[id]),lines(x[id]),`${id} live memo answers`);
 return {id,lines:lines(y[id])};
});
const result={quarters:b.quarters.length,identicalFrames:87,perQuarter:'identical, including western',quarterViews:87,dossiers:Object.keys(y).length,memoSample};
if(report)writeFileSync(report,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,memoSample:sample}));
