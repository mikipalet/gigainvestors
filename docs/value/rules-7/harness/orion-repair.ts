import {readFileSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {truncateTokens,SECTION_TOKENS} from '../../../../lib/value/reports/cut-sections';
const root='/Users/miki/data/value-rules/.audit/rules-7',c=root+'/corpus',id='001800.KO';
const text=readFileSync(root+'/primary/ORION-2025.txt','utf8');
const between=(start:string,end:string)=>{const a=text.indexOf(start),b=text.indexOf(end,a+start.length);if(a<0||b<a)throw Error('Missing Korean filing heading');return text.slice(a,b);};
const sections={business:between('II. 사업의 내용','III. 재무에 관한 사항'),mdna:between('IV. 이사의 경영진단 및 분석의견','V. 회계감사인의 감사의견 등'),notes:between('3. 연결재무제표 주석','4. 재무제표'),capital:between('4. 주식의 총수 등','5. 정관에 관한 사항'),auditor:between('V. 회계감사인의 감사의견 등','VI. 이사회 등 회사의 기관에 관한 사항'),compensation:between('VIII. 임원 및 직원 등에 관한 사항','IX. 계열회사 등에 관한 사항')};
const removed=[];
for(const rel of [`reports/${id}`,`raw/sec-annual/${id}.json`,`raw/sec-companyfacts/${id}.json`,`jev/${id}.json`,`judgement/${id}.json`,`flags/${id}.json`,`analysis/${id}.json`,`analysis/inputs/${id}.json`,`analysis/fingerprints/${id}.json`]){rmSync(c+'/'+rel,{recursive:true,force:true});removed.push(rel);}
mkdirSync(c+'/reports/'+id,{recursive:true});
for(const [key,value]of Object.entries(sections))writeFileSync(`${c}/reports/${id}/${key}.txt`,truncateTokens(value,SECTION_TOKENS[key as keyof typeof SECTION_TOKENS]));
const urls=JSON.parse(readFileSync(root+'/primary/urls.json','utf8'));
writeFileSync(`${c}/reports/${id}/meta.json`,JSON.stringify({id,kind:'annual-report',url:urls['ORION-2025'],filed:'2026-03-18',period:'2025-12-31',sections:Object.keys(sections)})+'\n');
writeFileSync(root+'/evidence/orion-repair.json',JSON.stringify({id,source:urls['ORION-2025'],removed,sections:Object.keys(sections),identity:'Orion Holdings, Korea; 2017 holding-company split; Korean listed shares 62645422'},null,2)+'\n');
