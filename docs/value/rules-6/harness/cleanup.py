"""Delete only this task's disposable copies after verified packaging."""
from pathlib import Path
import shutil,json
repo=Path('/Users/miki/data/value-rules');r=repo/'.audit/rules-6';e=r/'evidence'
assert json.loads((e/'verification.json').read_text())['passed']
assert json.loads((e/'bundle-integrity.json').read_text())['passed']
removed=[]
for name in ['corpus','baseline','baseline-code','candidate-final','storage','tmp','harness-bin','engines','research']:
 p=r/name
 if p.is_dir()and not p.is_symlink():shutil.rmtree(p)
 elif p.exists()or p.is_symlink():p.unlink()
 removed.append(str(p))
for p in [r/'harness.env',repo/'.next']:
 if p.is_dir():assert not p.is_symlink();shutil.rmtree(p)
 elif p.exists():p.unlink()
 removed.append(str(p))
for p in (repo/'docs/value/rules-6').rglob('__pycache__'):shutil.rmtree(p)
receipt={'complete':True,'removed':removed,'retained':'Original owner bundles, controller-backup, controller-runner-paused.resumed.json, tmp and dependency target untouched. New release-bundle-rules-6 and compact evidence retained.','freeBytes':{p:shutil.disk_usage(p).free for p in ['/','/Users/miki/data']}}
(e/'cleanup.json').write_text(json.dumps(receipt,indent=2)+'\n');(repo/'docs/value/rules-6/cleanup.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
