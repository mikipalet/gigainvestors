"""Delete only this task's disposable copies after verified packaging."""
from pathlib import Path
import shutil,json
repo=Path('/Users/miki/data/value-evolve');r=repo/'.audit/evolve-1';e=r/'evidence'
assert json.loads((e/'verification.json').read_text())['passed']
assert json.loads((e/'bundle-integrity.json').read_text())['passed']
removed=[]
for name in ['corpus','baseline','candidate-final','storage','tmp','harness-bin','engines','research']:
 p=r/name
 if p.is_dir()and not p.is_symlink():shutil.rmtree(p)
 elif p.exists()or p.is_symlink():p.unlink()
 removed.append(str(p))
for p in [r/'harness.env',repo/'.next']:
 if p.is_dir():assert not p.is_symlink();shutil.rmtree(p)
 elif p.exists():p.unlink()
 removed.append(str(p))
for p in (repo/'docs/value/evolve-1').rglob('__pycache__'):shutil.rmtree(p)
receipt={'complete':True,'removed':removed,'retained':'release-bundle-evolve-1, .audit/evolve-1/evidence and docs/value/evolve-1/evidence retained; nothing outside this task touched.','freeBytes':{p:shutil.disk_usage(p).free for p in ['/','/Users/miki/data']}}
(e/'cleanup.json').write_text(json.dumps(receipt,indent=2)+'\n');(repo/'docs/value/evolve-1/cleanup.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
