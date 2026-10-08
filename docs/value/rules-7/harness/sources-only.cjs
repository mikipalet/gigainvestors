// Issuer-source repair: only SEC, the ESEF index and Jev; EODHD and everything else stay closed.
const allowed=new Set(['https://www.sec.gov','https://data.sec.gov','https://filings.xbrl.org','https://api.typesafe.ai']);
const original=globalThis.fetch;
globalThis.fetch=(url,options)=>{const u=new URL(typeof url==='string'?url:url.url);if(!allowed.has(u.origin)||(u.origin==='https://api.typesafe.ai'&&u.pathname!=='/v1/systemone'))throw Error('Research network denied: '+u.origin);return original(url,options);};
const Module=require('module'),load=Module._load;Module._load=function(id,...args){if(id==='dotenv')return {config:()=>({})};return load.call(this,id,...args);};
