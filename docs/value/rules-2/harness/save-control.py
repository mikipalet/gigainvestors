import json,shutil
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-2')
for id in json.loads((r/'evidence/released-ids.json').read_text()):
 for rel in [f'analysis/{id}.json',f'analysis/inputs/{id}.json']:
  p=r/'corpus'/rel
  if p.exists():
   dst=r/'control-analyses'/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dst)
