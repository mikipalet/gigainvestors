"""Local proposal only. Restore both private policy files in finally; no live writes."""
import json,os,subprocess
from pathlib import Path
root=Path.home()/'data/value-holds';corpus=root/'corpus'
for volume in [Path('/'),root]:
 s=os.statvfs(volume);assert s.f_bavail*s.f_frsize>=4*1024**3,'DISK STOP: commit'
freeze=corpus/'verdict-freeze.json';release=corpus/'held-membership/release.json';before={freeze:freeze.read_bytes(),release:release.read_bytes()}
try:
 f=json.loads(before[freeze]);f['ids'].remove('FRFHF.US');freeze.write_text(json.dumps(f)+'\n')
 r=json.loads(before[release]);r['baselineAnalysisHashes']['FRFHF.US']=None;release.write_text(json.dumps(r)+'\n')
 env={**os.environ,'VALUE_CORPUS_DIR':str(corpus),'VALUE_NO_EODHD':'1','NODE_OPTIONS':'--max-old-space-size=1536'}
 with (root/'logs/holds-2/fairfax-publish.log').open('w') as log:
  result=subprocess.run(['node','--conditions=react-server','--import','tsx','scripts/value/cli.ts','publish','--out',str(root/'staging/fairfax-unfreeze')],env=env,stdout=log,stderr=subprocess.STDOUT)
 if result.returncode:raise SystemExit(result.returncode)
finally:
 for p,body in before.items():p.write_bytes(body)
print('Ordinary Fairfax unfreeze proposal written locally; private policy restored')
