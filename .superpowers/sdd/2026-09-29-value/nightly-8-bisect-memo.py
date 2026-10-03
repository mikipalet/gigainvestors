from pathlib import Path
import subprocess,tarfile,io,os,shutil,json
r=Path('.fix5c/nightly-8').resolve();d=r/'bisect-source';c=r/'bisect-fixture';c.mkdir(exist_ok=True)
if shutil.disk_usage(r).free<4*1024**3:raise SystemExit(128)
rev=subprocess.check_output(['git','rev-parse','BISECT_HEAD'],text=True).strip()
if d.exists():shutil.rmtree(d)
d.mkdir()
archive=subprocess.check_output(['git','archive',rev,'lib','scripts/value','package.json','tsconfig.json'])
with tarfile.open(fileobj=io.BytesIO(archive)) as t:t.extractall(d,filter='data')
(d/'node_modules').symlink_to(Path('node_modules').resolve())
a=json.loads(Path('/Users/miki/value-corpus/analysis/KO.US.json').read_text());a['ownerMemo']={'version':1,'asOf':'2026-10-03','inputHash':'fixture','lines':[{'question':3,'answer':'Released filing answer','basis':'filing','evidence':[]}]};a['tests']['moat']['series']['grossMargin']=[[2021,.4],[2022,.4],[2023,.4]]
(c/'analysis').mkdir(exist_ok=True);(c/'analysis/KO.US.json').write_text(json.dumps(a))
code="const fs=require('fs');global.fetch=()=>{throw Error('network forbidden')}; const {loadAnalyses}=require(process.argv[1]);const a=JSON.parse(fs.readFileSync(process.argv[2])); const out=loadAnalyses([a.company])[0];if(!out)process.exit(125);process.exit(out.ownerMemo.lines.find(l=>l.question===3)?.answer==='Released filing answer'?0:1)"
result=subprocess.run(['node','--import','tsx','-e',code,str(d/'scripts/value/stages/publish.ts'),str(c/'analysis/KO.US.json')],env={**os.environ,'VALUE_CORPUS_DIR':str(c),'TSX_DISABLE_CACHE':'1'},capture_output=True,text=True)
with (r/'bisect-memo-probes.jsonl').open('a') as f:f.write(json.dumps({'commit':rev,'exit':result.returncode})+'\n')
# Do not confuse infrastructure/module errors with a reproduced failed assertion.
if result.returncode not in [0,1] or result.stderr:raise SystemExit(125)
raise SystemExit(result.returncode)
