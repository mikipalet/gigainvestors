const fs=require('node:fs'),path=require('node:path');
const root=__dirname,corpus=path.join(root,'corpus'),original={...fs};
const protectedRoot=path.join(root,'live-baseline');
function log(file,row){const fd=original.openSync(path.join(root,file),'a');try{original.writeSync(fd,JSON.stringify(row)+'\n')}finally{original.closeSync(fd)}}
function stop(reason){log('stops.jsonl',{at:new Date().toISOString(),reason});console.error(reason);process.exit(86)}
function disk(){const s=original.statfsSync(root);if(s.bavail*s.bsize<4*1024**3)stop('DISK STOP: below 4 GiB')}
function guard(file,cow=false){if(String(file).split('/').includes('publish-repo'))stop('publish-repo is read-only');if(typeof file==='number')stop('untracked file descriptor write');const p=path.resolve(String(file));let parent=path.dirname(p);while(!original.existsSync(parent))parent=path.dirname(parent);const real=original.realpathSync(parent);if((!real.startsWith(root+'/')&&real!==root)||real===protectedRoot||real.startsWith(protectedRoot+'/')||real===path.join(root,'live-current')||real.startsWith(path.join(root,'live-current')+'/')||real===path.join(root,'frozen-inputs')||real.startsWith(path.join(root,'frozen-inputs')+'/'))stop('write outside writable staging');if(original.existsSync(p)&&original.lstatSync(p).isSymbolicLink())stop('write through read-only file symlink');disk();if(cow&&original.existsSync(p)&&original.statSync(p).nlink>1){original.copyFileSync(p,p+'.cow');original.renameSync(p+'.cow',p)}}
for(const name of ['writeFileSync','appendFileSync','mkdirSync','rmSync','unlinkSync'])fs[name]=function(file,...args){guard(file,name==='appendFileSync'||name==='writeFileSync');return original[name](file,...args)};
fs.renameSync=function(a,b){guard(a);guard(b);if(original.existsSync(b)&&original.statSync(b).isFile()&&original.readFileSync(a).equals(original.readFileSync(b))){original.unlinkSync(a);return;}return original.renameSync(a,b)};
for(const name of ['linkSync','copyFileSync','cpSync'])fs[name]=function(a,b,...args){guard(b,name==='copyFileSync');return original[name](a,b,...args)};
process.env.VALUE_CORPUS_DIR=corpus;process.env.VALUE_NO_EODHD='1';process.env.VALUE_BUSINESS_CACHED_ONLY='1';
const fetch=globalThis.fetch;globalThis.fetch=async function(url,...args){disk();const u=new URL(String(url));log('network.jsonl',{at:new Date().toISOString(),host:u.hostname,path:u.pathname});if(u.hostname!=='api.typesafe.ai')throw new Error('Cache-only replay blocked network: '+u.hostname);return fetch.call(this,url,...args)};
require('node:module').syncBuiltinESMExports();
