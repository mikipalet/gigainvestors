import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {Parser} from 'htmlparser2';
import {Company} from '../../components/company/Company';
import type {PageSample} from './publication-coverage';
import type {Dossier,PriceMap} from '../../lib/value/types';

export function renderCompanyPage(dossier:Dossier,expectLogo:boolean,quote:PriceMap[string]|null=null):void {
 const html=renderToStaticMarkup(React.createElement(Company,{dossier,quote,stock:null,investors:{}}));
 let main=false,heading=false,img=false,inHeading=0;
 const parser=new Parser({onopentag(name,attrs){
  if(name==='main'&&attrs.class?.split(' ').includes('company-page'))main=true;
  if(name==='h1')heading=true;
  if(inHeading)inHeading++;
  if(attrs.class?.split(' ').includes('company-heading'))inHeading=1;
  if(inHeading&&name==='img'&&attrs.src)img=true;
 },onclosetag(){if(inHeading)inHeading--;}});
 parser.write(html);parser.end();
 if(!main||!heading||(expectLogo&&!img))throw Error('Company page or expected logo img missing');
}
if(process.argv[1]?.endsWith('render-publication-pages.ts')){
 const repo=process.argv[2],samples:PageSample[]=JSON.parse(readFileSync(0,'utf8')),failed:string[]=[];
 const aliasFile=path.join(repo,'aliases.json'),aliases=existsSync(aliasFile)?JSON.parse(readFileSync(aliasFile,'utf8')):{};
 for(const sample of samples){try{const dossier=JSON.parse(readFileSync(path.join(repo,sample.file),'utf8'))[aliases[sample.id]??sample.id];const priceFile=path.join(repo,'prices',`${dossier.company.country}.json`);const quote=existsSync(priceFile)?JSON.parse(readFileSync(priceFile,'utf8'))[dossier.id]??null:null;renderCompanyPage(dossier,Boolean(sample.logo),quote);}catch{failed.push(sample.id);}}
 console.log(JSON.stringify({passed:samples.length-failed.length,failed}));
}
