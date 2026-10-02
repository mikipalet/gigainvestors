import {it,expect,vi} from 'vitest';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import os from 'node:os';
import path from 'node:path';
import {businessSources,hasBusinessText,topicalSources} from '../../../lib/value/business/sources';
import type {Analysis} from '../../../lib/value/types';
it('an empty compressed cache cannot hide existing home-filing sections',async()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'memo-sources-'));vi.stubEnv('VALUE_CORPUS_DIR',root);
 try{
  mkdirSync(path.join(root,'business-backfill/sections-v2'),{recursive:true});writeFileSync(path.join(root,'business-backfill/sections-v2/T.JP.json.gz'),gzipSync('[]'));
  const a={id:'T.JP',company:{country:'JP'},report:{kind:'EDINET',url:'https://disclosure2dl.edinet-fsa.go.jp/searchdocument/pdf/S100.pdf',sections:['mdna'],filed:'2026',period:'2025'}} as unknown as Analysis;
  expect(hasBusinessText(a)).toBe(false);
  mkdirSync(path.join(root,'reports/T.JP'),{recursive:true});writeFileSync(path.join(root,'reports/T.JP/mdna.txt'),'販売価格は4%上昇した。');
  expect(hasBusinessText(a)).toBe(true);expect((await businessSources(a)).sources[0].text).toContain('4%');
 }finally{vi.unstubAllEnvs();rmSync(root,{recursive:true,force:true});}
});
it('retains native-language MD&A even without an English keyword',()=>{
 const text='販売価格は4%上昇した。';
 expect(topicalSources([{text,url:'https://issuer.test',filed:'2026',section:'mdna',quote:''}])[0].text).toBe(text);
});
