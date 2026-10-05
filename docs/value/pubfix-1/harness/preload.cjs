// Test-only external boundaries; production publication/build/git code stays real.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const root=process.env.PUBFIX_ROOT;
if(!root||!process.env.VALUE_CORPUS_DIR.startsWith(root+'/'))throw Error('Sandbox corpus required');
const log=(event)=>fs.appendFileSync(path.join(root,'evidence/boundaries.jsonl'),JSON.stringify(event)+'\n');
const RealDate=Date,instant=RealDate.parse('2026-10-05T09:10:50.000Z');
global.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[instant]));}static now(){return instant;}};
const blobRoot=path.join(root,'storage/blob');
const blob={
 async get(key){const file=path.join(blobRoot,key);if(!fs.existsSync(file))return null;return {statusCode:200,stream:new Response(fs.readFileSync(file)).body};},
 async put(key,data){
  if(key.includes('..')||!key.startsWith('value/'))throw Error('Invalid sandbox Blob path');
  const file=path.join(blobRoot,key);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);
  log({kind:'blob-put',key,bytes:Buffer.byteLength(data)});return {pathname:key};
 }
};
const load=Module._load;
Module._load=function(id,...rest){if(id==='@vercel/blob')return blob;return load.call(this,id,...rest);};
global.fetch=async(url,options)=>{
 if(String(url)==='https://pubfix.invalid/revalidate'&&options?.method==='POST'){
  log({kind:'revalidate',method:'POST'});return new Response('{}',{status:200});
 }
 throw Error('Sandbox blocked unexpected network request');
};
