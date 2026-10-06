"""Remove this task's disposable copies; retain source and review artifacts."""
import json,shutil
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-3');repo=Path('/Users/miki/data/value-rules');e=r/'evidence'
assert json.loads((e/'verification.json').read_text())['passed']
# Keep the disk watcher active through removal; it only writes to evidence.
removed=[]
for name in ['corpus','baseline','control-code','control-analyses','control-store','candidate-final','candidate-proposal','candidate-pre-basis','storage','tmp','harness-bin']:
 p=r/name
 if p.is_dir()and not p.is_symlink():shutil.rmtree(p)
 elif p.exists()or p.is_symlink():p.unlink()
 removed.append(str(p))
p=r/'harness.env'
if p.exists():p.unlink();removed.append(str(p))
p=repo/'.next';assert not p.is_symlink()
if p.exists():shutil.rmtree(p);removed.append(str(p))
for p in (repo/'docs/value/rules-3/harness').rglob('__pycache__'):shutil.rmtree(p)
free={p:shutil.disk_usage(p).free for p in ['/','/Users/miki/data']};assert min(free.values())>=4*1024**3
receipt={'complete':True,'removed':removed,'retained':'Source worktree, committed review evidence and local release bundle only; pre-existing dependency symlink target untouched','freeBytes':free}
(e/'cleanup.json').write_text(json.dumps(receipt,indent=2)+'\n');(repo/'docs/value/rules-3/cleanup.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2))
