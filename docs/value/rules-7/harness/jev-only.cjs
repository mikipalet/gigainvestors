const original=globalThis.fetch;
globalThis.fetch=(url,options)=>{const u=new URL(typeof url==='string'?url:url.url);if(u.origin!=='https://api.typesafe.ai'||u.pathname!=='/v1/systemone')throw Error('Research network denied: '+u.origin);return original(url,options);};
const Module=require('module'),load=Module._load;Module._load=function(id,...args){if(id==='dotenv')return {config:()=>({})};return load.call(this,id,...args);};
