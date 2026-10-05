import {readFileSync,writeFileSync,mkdirSync,copyFileSync,statfsSync} from 'node:fs';
import sharp from '/Users/miki/GitHub/superinvestors-wt/value-logos/node_modules/sharp';
import {readCorpusJson,writeCorpusJson,corpusPath} from '/Users/miki/GitHub/superinvestors-wt/value-logos/lib/value/corpus';
import {iconHash,rejectedLogoHashes} from '/Users/miki/GitHub/superinvestors-wt/value-logos/lib/value/logo-validation';
async function main(){
 const root=process.env.HOME+'/data/value-logos',e=root+'/evidence',bundle=root+'/bundle';mkdirSync(bundle+'/records',{recursive:true});mkdirSync(bundle+'/assets',{recursive:true});
 const reviews=JSON.parse(readFileSync(e+'/visual-review.json','utf8')),rows=JSON.parse(readFileSync(e+'/missing-before.json','utf8'));const entries=[],fallbacks=[];let approved=0;
 for(const row of rows){
  for(const dir of ['/',root]){const d=statfsSync(dir);if(d.bavail*d.bsize<4*1024**3)throw Error('DISK STOP');}
  const file=`enrichment-v7/logos/${row.id}.json`,record=readCorpusJson<any>(file)??{};const review=reviews[row.id];
  if(record.asset&&review?.decision==='pass'&&(review.asset===record.asset||record.reviewedInputAsset===review.asset)&&!rejectedLogoHashes(row.id).has(record.originalHash)){
   if(!record.reviewedInputAsset){
    const bytes=Buffer.from(readCorpusJson<any>(`enrichment-v7/logos/assets/${record.asset}.json`).data,'base64');
    const preview=await sharp(bytes).resize(32,32,{fit:'inside'}).ensureAlpha().raw().toBuffer();let visible=0,dark=0;
    for(let i=0;i<preview.length;i+=4)if(preview[i+3]>32){visible++;if(Math.min(preview[i],preview[i+1],preview[i+2])<220)dark++;}
    const meta=await sharp(bytes).metadata(),opaque=(await sharp(bytes).stats()).isOpaque;
    const corner=await sharp(bytes).flatten({background:'#ffffff'}).extract({left:0,top:0,width:1,height:1}).removeAlpha().raw().toBuffer();
    const paper=`rgb(${corner[0]},${corner[1]},${corner[2]})`;const background=visible&&((meta.hasAlpha&&!opaque&&dark/visible<.9)||dark/visible<.01)?'#263238':opaque?paper:'#ffffff';
    const output=await sharp(bytes).resize(128,128,{fit:'contain',background,withoutEnlargement:true}).flatten({background}).webp({quality:95}).toBuffer();
    record.reviewedInputAsset=record.asset;record.asset=iconHash(output);writeCorpusJson(`enrichment-v7/logos/assets/${record.asset}.json`,{data:output.toString('base64')});
   }
   record.logo=`/api/value/logo?asset=${record.asset}`;record.identityReview='passed';record.review={at:new Date().toISOString(),note:review.note,lightAndDark:true,tilePx:26};delete record.pendingLogo;delete record.fallbackReason;approved++;
   copyFileSync(corpusPath(`enrichment-v7/logos/assets/${record.asset}.json`),bundle+'/assets/'+record.asset+'.json');
  }else{
   record.logo=null;record.identityReview='rejected';record.validated=true;record.validationVersion=2;record.retryable=false;record.verifiedAt=new Date().toISOString();
   record.fallbackReason=review?.decision==='reject'?review.note:record.asset?'Candidate changed after review; withheld':'No reliable image found by the existing pipeline';
   delete record.pendingLogo;fallbacks.push({id:row.id,name:row.n,reason:record.fallbackReason,website:record.website??null});
  }
  writeCorpusJson(file,record);const dest=bundle+'/records/'+row.id+'.json';copyFileSync(corpusPath(file),dest);entries.push({id:row.id,recordHash:iconHash(readFileSync(dest)),logo:record.logo});
 }
 writeFileSync(bundle+'/manifest.json',JSON.stringify({version:1,createdAt:new Date().toISOString(),baselineCount:3950,missingBefore:1165,approved,fallbacks:fallbacks.length,entries},null,2)+'\n');
 writeFileSync(e+'/fallbacks.json',JSON.stringify(fallbacks,null,2)+'\n');console.log({approved,fallbacks:fallbacks.length,missingBefore:1165,missingAfter:fallbacks.length,total:3950});
}main();
