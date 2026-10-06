const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {syncBuiltinESMExports}=require('node:module');
const corpus=fs.realpathSync('/Users/miki/value-corpus');
const realpath=fs.realpathSync;
function resolved(p){
 if(typeof p!=='string'&&!(p instanceof URL)&&!Buffer.isBuffer(p))return null;
 let file=p instanceof URL?require('node:url').fileURLToPath(p):String(p),tail=[];file=path.resolve(file);
 while(!fs.existsSync(file)){tail.unshift(path.basename(file));const parent=path.dirname(file);if(parent===file)break;file=parent;}
 return path.join(realpath(file),...tail);
}
function guard(p){const s=resolved(p);if(s&&(s===corpus||s.startsWith(corpus+'/')))throw Error('Read-only source corpus: write blocked');}
for(const name of ['writeFile','appendFile','mkdir','rm','rmdir','unlink','truncate','chmod','chown','utimes','createWriteStream']){
 for(const api of [fs,fsp])if(typeof api[name]==='function'){const original=api[name];api[name]=function(p,...args){guard(p);return original.call(this,p,...args);};}
 const key=name+'Sync';if(typeof fs[key]==='function'){const original=fs[key];fs[key]=function(p,...args){guard(p);return original.call(this,p,...args);};}
}
for(const name of ['rename','copyFile','cp','link','symlink']){
 for(const api of [fs,fsp])if(typeof api[name]==='function'){const original=api[name];api[name]=function(src,dst,...args){if(name==='rename')guard(src);guard(dst);return original.call(this,src,dst,...args);};}
 const key=name+'Sync';if(typeof fs[key]==='function'){const original=fs[key];fs[key]=function(src,dst,...args){if(name==='rename')guard(src);guard(dst);return original.call(this,src,dst,...args);};}
}
for(const api of [fs,fsp]){const original=api.open;api.open=function(p,flags,...args){if(typeof flags==='number'?flags!==fs.constants.O_RDONLY:/[wa+]/.test(flags))guard(p);return original.call(this,p,flags,...args);};}
const openSync=fs.openSync;fs.openSync=function(p,flags,...args){if(typeof flags==='number'?flags!==fs.constants.O_RDONLY:/[wa+]/.test(flags))guard(p);return openSync.call(this,p,flags,...args);};
if(process.env.CALIB_TEST_HOME){fs.mkdirSync(process.env.CALIB_TEST_HOME,{recursive:true});os.homedir=()=>process.env.CALIB_TEST_HOME;}
syncBuiltinESMExports();
const nativeFetch=globalThis.fetch;globalThis.fetch=(url,init)=>{const host=new URL(typeof url==='string'||url instanceof URL?url:url.url).hostname;if(!['localhost','127.0.0.1','[::1]'].includes(host))throw Error('External network blocked for offline proof');return nativeFetch(url,init);};
setInterval(()=>{for(const p of ['/','/Users/miki/data']){const s=fs.statfsSync(p);if(s.bavail*s.bsize<4*1024**3){process.stderr.write('DISK STOP: below 4 GiB\n');process.exit(74);}}},5000).unref();
