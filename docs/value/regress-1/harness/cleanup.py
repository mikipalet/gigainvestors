"""Remove only this task's disposable copies after bundle verification."""
import json,shutil,time,os
from pathlib import Path
r=Path.home()/'data/regress';e=r/'evidence'
assert json.loads((e/'bundle-integrity.json').read_text())['passed']
assert json.loads((e/'secret-scan.json').read_text())['findingCount']==0
assert json.loads((r/'release-bundle/manifest.json').read_text())['status']=='NOT'
paths=['corpus','baseline','candidate','candidate-final','dry-run','node_modules','storage','tmp','test-home','harness-bin','repo/.next','repo/node_modules','repo/tsconfig.tsbuildinfo']
removed=[]
for rel in paths:
 p=r/rel
 assert p.parent.resolve().is_relative_to(r.resolve())
 if p.is_symlink():p.unlink()
 elif p.is_dir():shutil.rmtree(p)
 elif p.exists():p.unlink()
 assert not p.exists()and not p.is_symlink()
 removed.append(rel)
free=lambda p:(lambda s:s.f_bavail*s.f_frsize)(os.statvfs(p))
result={'completed':True,'at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'removed':removed,'remaining':[p.name for p in r.iterdir()],'freeBytes':{'/':free('/'),'data':free(r)}}
(e/'cleanup.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
