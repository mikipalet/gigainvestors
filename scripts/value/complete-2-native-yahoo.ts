import {readFileSync,writeFileSync,mkdirSync,existsSync,statfsSync} from 'node:fs';import {join} from 'node:path';import {homedir} from 'node:os';
import {YAHOO_FIELDS,yearsFromYahoo,fillYears} from '../../lib/value/completeness/second-sources';
const stage=join(homedir(),'value-corpus/staging/release-8/complete-2');if(process.env.VALUE_CORPUS_DIR!==stage)throw Error('Staging only');
const listings:Record<string,string>={'GIGNF.US':'G13.SI','CPAMF.US':'C38U.SI','CLILF.US':'9CI.SI','FRZCF.US':'J69U.SI','FRLOF.US':'BUOU.SI','KPDCF.US':'AJBU.SI','M2L.F':'ME8U.SI','MAPGF.US':'M44U.SI','S8N0.F':'5E2.SI','SCRPF.US':'U96.SI','YSHLF.US':'BS6.SI','S3Z.F':'A17U.SI','BI0.F':'N2IU.SI','SJX.F':'S63.SI','T6W.F':'Y92.SI','U1O.F':'U14.SI','VEM.F':'V03.SI','RTHA.F':'F34.SI','VETTF.US':'VCT.NZ','SARDF.US':'SAN.NZ','AOTUF.US':'PCT.NZ','KWIPF.US':'KPG.NZ','IGPYF.US':'ARG.NZ','SKLUY.US':'SKL.NZ','NK7.F':'MFT.NZ','PKF1.F':'POT.NZ','VTHPF.US':'VHP.NZ','PYIYF.US':'PFI.NZ','S05.F':'SKC.NZ','MEZ.AU':'MEL.NZ','CHI.AU':'CHI.NZ','BGP.AU':'BGP.NZ','VGL.AU':'VGL.NZ','OCA.AU':'OCA.NZ','KMD.AU':'KMD.NZ','HGH.AU':'HGH.NZ','GTK.AU':'GTK.NZ'};
const read=(p:string)=>existsSync(p)?JSON.parse(readFileSync(p,'utf8')):null;
async function main(){mkdirSync(join(stage,'sources/native-yahoo'),{recursive:true});for(const [id,symbol] of Object.entries(listings)){
 const disk=statfsSync('/');if(disk.bavail*disk.bsize<5*1024**3)throw Error('Disk below 5 GiB');const url=`https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?${new URLSearchParams({type:Object.keys(YAHOO_FIELDS).map(k=>'annual'+k).join(','),period1:'1262304000',period2:String(Math.floor(Date.now()/1000))})}`;
 try{const file=join(stage,`sources/native-yahoo/${id}.json`);let raw=read(file);if(!raw){const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`HTTP ${r.status}`);raw=await r.json();writeFileSync(file,JSON.stringify(raw));await new Promise(r=>setTimeout(r,1200));}
 const ys=yearsFromYahoo(raw,'',url),entry=read(join(stage,`completeness/verified/${id}.json`)),current=read(join(stage,`fundamentals/${id}.json`));
 const matches=ys.filter(y=>[...(entry?.fundamentals.years??[]),...(current?.years??[])].some(a=>a.end===y.end&&['netIncome','totalAssets'].every(k=>a[k]&&y[k as keyof typeof y]&&Math.abs(a[k]/Number(y[k as keyof typeof y])-1)<.01)));
 if(matches.length<2){console.log(id,symbol,'not corroborated',matches.length);continue;}
 const path=join(stage,`completeness/yahoo/${id}.json`);writeFileSync(path,JSON.stringify(fillYears(ys,read(path)??[])));console.log(id,symbol,ys.length,'matches',matches.length);
 }catch(e){console.log(id,(e as Error).message);if((e as Error).message.includes('429'))throw e;}
}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
