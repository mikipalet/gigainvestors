from pathlib import Path
import tarfile,hashlib,json
repo=Path('/Users/miki/data/value-rules');out=repo/'research/valuation/outputs';p=out/'replay-evidence.tar.gz'
paths=[repo/'.audit/rules-5'/name for name in ['sbc_once','current_scale','combined','replay']]+[out/'baseline',out/'candidate']
with tarfile.open(p,'w:gz',compresslevel=1)as t:
 for source in paths:
  for f in sorted(source.rglob('*')):
   if f.is_file():t.add(f,arcname=str(f.relative_to(repo)),recursive=False)
h=hashlib.sha256(p.read_bytes()).hexdigest()
with tarfile.open(p)as t:n=sum(1 for _ in t)
(out/'replay-evidence-manifest.json').write_text(json.dumps({'sha256':h,'files':n,'bytes':p.stat().st_size,'extractAt':'repository root'},indent=2)+'\n');print(n,'archived evidence/engine/input files',p.stat().st_size,'bytes')
