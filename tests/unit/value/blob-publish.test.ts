vi.mock('@/scripts/value/publication-upload-guard',()=>({assertUploadReady:vi.fn()}));
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach,expect,it,vi} from 'vitest';
const {put,get}=vi.hoisted(()=>({put:vi.fn(),get:vi.fn()}));vi.mock('@vercel/blob',()=>({put,get}));
import {uploadPublishedSnapshot} from '@/scripts/value/blob-publish';
let dir:string;
afterEach(()=>{if(dir)rmSync(dir,{recursive:true,force:true});vi.resetAllMocks();vi.unstubAllEnvs();});
function setup(){vi.stubEnv('VALUE_DATA_READ_WRITE_TOKEN','vercel_blob_rw_teststore_secret');dir=mkdtempSync(path.join(tmpdir(),'blob-publish-'));writeFileSync(path.join(dir,'meta.json'),' {"ok":true}\n');mkdirSync(path.join(dir,'staging'));writeFileSync(path.join(dir,'staging/secret.json'),'secret');get.mockResolvedValue(null);put.mockResolvedValue({});}
it('uploads byte-identical allowed files under a version before switching the pointer',async()=>{
 setup();const result=await uploadPublishedSnapshot(dir);expect(result.files).toBe(1);expect(put).toHaveBeenCalledTimes(2);
 expect(put.mock.calls[0][0]).toBe(`value/versions/${result.version}/meta.json`);expect(put.mock.calls[0][1].toString()).toBe(' {"ok":true}\n');expect(put.mock.calls[0][2]).toMatchObject({access:'private',addRandomSuffix:false});expect(put.mock.calls[1][0]).toBe('value/current.json');
});
it('does not switch the pointer on a failed upload',async()=>{setup();put.mockRejectedValue(new Error('upload failed'));await expect(uploadPublishedSnapshot(dir)).rejects.toThrow('upload failed');expect(put.mock.calls.some(c=>c[0]==='value/current.json')).toBe(false);});
it('changes version when bytes change and safely resumes an already active snapshot',async()=>{
 setup();const first=await uploadPublishedSnapshot(dir);put.mockClear();get.mockResolvedValue({statusCode:200,stream:new Response(JSON.stringify({version:first.version,schema:2})).body});expect((await uploadPublishedSnapshot(dir)).uploaded).toBe(false);expect(put).not.toHaveBeenCalled();
 writeFileSync(path.join(dir,'meta.json'),'{}');get.mockResolvedValue(null);expect((await uploadPublishedSnapshot(dir)).version).not.toBe(first.version);
});
it('retains hashed files in a shared immutable namespace as well as the versioned snapshot',async()=>{
 setup();mkdirSync(path.join(dir,'views'));const file=`views/${'a'.repeat(24)}.json`;writeFileSync(path.join(dir,file),'hashed bytes');const result=await uploadPublishedSnapshot(dir);
 expect(put.mock.calls.map(c=>c[0])).toContain(`value/versions/${result.version}/${file}`);expect(put.mock.calls.map(c=>c[0])).toContain(`value/immutable/${file}`);expect(put.mock.calls.at(-1)?.[0]).toBe('value/current.json');
});
