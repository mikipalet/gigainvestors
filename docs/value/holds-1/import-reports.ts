/** Install explicitly reviewed annual report sections into a private recovery directory. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SECTION_TOKENS,truncateTokens} from '../../../lib/value/reports/cut-sections';
import {cutEsefSections} from '../../../lib/value/reports/esef';
import type {SectionKey} from '../../../lib/value/types';
const root=process.argv[2];if(!root||!root.includes('/data/value-holds'))throw Error('Private holds directory required');
const rows=JSON.parse(readFileSync(root+'/evidence/report-page-ranges.json','utf8'));
const urls=JSON.parse(readFileSync(root+'/evidence/pdf-sources.json','utf8'));
const evidence=[];const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
for(const row of rows){
 const pages=readFileSync(root+'/downloads/'+row.document+'.txt','utf8').split('\f');
 const sections:Record<string,string>={};
 for(const [key,range]of Object.entries(row.sections) as Array<[SectionKey,[number,number]]>){
  if(range[0]<1||range[1]>=pages.length||range[1]<range[0])throw Error('Invalid page range');
  sections[key]=truncateTokens(pages.slice(range[0]-1,range[1]).join('\n\n'),SECTION_TOKENS[key]);
 }
 if(row.document==='OGC')sections.business=truncateTokens(readFileSync(root+'/downloads/OGC-aif.txt','utf8').split('\f').slice(8,29).join('\n\n'),SECTION_TOKENS.business);
 const source={document:row.document,url:urls[row.document],sha256:sha(readFileSync(root+'/downloads/'+row.document+'.pdf')),pdfPages:row.sections};
 for(const id of row.ids){
  const out=root+'/recovered-reports/'+id;mkdirSync(out,{recursive:true});
  for(const [key,text]of Object.entries(sections))writeFileSync(out+'/'+key+'.txt',text);
  writeFileSync(out+'/meta.json',JSON.stringify({id,kind:'annual-report',url:source.url,filed:row.filed,period:row.period,sections:Object.keys(sections)}));
  const sources=[source,...(row.document==='OGC'?[{document:'OGC-aif',url:urls['OGC-aif'],sha256:sha(readFileSync(root+'/downloads/OGC-aif.pdf')),pdfPages:{business:[9,29]}}]:[])];
  const binding={id,reviewedFullAnnual:true,period:row.period,sources,sectionHashes:Object.fromEntries(Object.entries(sections).map(([key,text])=>[key,sha(text)]))};
  writeFileSync(out+'/annual-sources.json',JSON.stringify(binding));evidence.push(binding);
 }
}
const meta=JSON.parse(readFileSync(root+'/downloads/DVCMY-esef.json','utf8'));
const html=readFileSync(root+'/downloads/DVCMY.xhtml','utf8'),sections=cutEsefSections(html);
for(const id of ['DVCMY.US','DVDCF.US']){
 const out=root+'/recovered-reports/'+id;mkdirSync(out,{recursive:true});
 for(const [key,text]of Object.entries(sections))writeFileSync(out+'/'+key+'.txt',text!);
 writeFileSync(out+'/meta.json',JSON.stringify({id,kind:'ESEF',url:meta.url,filed:meta.filed,period:meta.period,sections:Object.keys(sections)}));
 const binding={id,reviewedFullAnnual:true,period:meta.period,sources:[{url:meta.url,sha256:sha(html),lei:meta.lei}],sectionHashes:Object.fromEntries(Object.entries(sections).map(([key,text])=>[key,sha(text!)]))};
 writeFileSync(out+'/annual-sources.json',JSON.stringify(binding));evidence.push(binding);
}
writeFileSync(root+'/evidence/recovered-report-bindings.json',JSON.stringify(evidence,null,2));console.log('Recovered',evidence.length,'listing reports');
