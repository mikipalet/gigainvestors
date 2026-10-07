"""Delete only rules-5 disposable copies after packaging and verification."""
from pathlib import Path
import shutil,json
repo=Path('/Users/miki/data/value-rules');r=repo/'.audit/rules-5';e=r/'evidence'
assert json.loads((e/'verification.json').read_text())['complete']
assert json.loads((e/'bundle-integrity.json').read_text())['passed']
removed=[]
for name in ['corpus','baseline','baseline-code','candidate-final','storage','tmp','harness-bin','sbc_once','current_scale','combined','replay']:
 p=r/name
 if p.is_dir()and not p.is_symlink():shutil.rmtree(p)
 elif p.exists()or p.is_symlink():p.unlink()
 removed.append(str(p))
for p in [r/'harness.env',repo/'.next']:
 if p.is_dir():assert not p.is_symlink();shutil.rmtree(p)
 elif p.exists():p.unlink()
 removed.append(str(p))
for name in ['baseline','candidate']:
 p=repo/'research/valuation/outputs'/name
 if p.exists():shutil.rmtree(p);removed.append(str(p))
for base in [repo/'research/valuation',repo/'docs/value/rules-5']:
 for p in base.rglob('__pycache__'):shutil.rmtree(p)
free={p:shutil.disk_usage(p).free for p in ['/','/Users/miki/data']}
receipt={'complete':True,'removed':removed,'retained':'Original owner release-bundle, controller-backup, controller-runner-paused.resumed.json, tmp and dependency symlink are untouched. New release-bundle-rules-5 and committed evidence retained.','freeBytes':free}
(e/'cleanup.json').write_text(json.dumps(receipt,indent=2)+'\n');(repo/'docs/value/rules-5/cleanup.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
