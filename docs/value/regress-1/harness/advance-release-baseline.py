"""Move already published additions into the baseline for the next release.
Keep their pre-reanalysis hashes: this does NOT freeze refreshed analyses.
New additions still require all first-publication input checks.
"""
import json,hashlib
from pathlib import Path
root=Path.home()/'data/regress';corpus=root/'corpus';live=Path.home()/'value-corpus'
p=corpus/'held-membership/release.json';d=json.loads(p.read_text())
published={id for f in (root/'baseline/dossiers').glob('*.json')for id in json.loads(f.read_text())}
alias=json.loads((root/'baseline/aliases.json').read_text())
old=[id for id in d['additionIds']if id in published or alias.get(id)in published]
for id in old:
 f=live/'analysis'/f'{id}.json'
 d['baselineAnalysisHashes'][id]=hashlib.sha256(f.read_bytes()).hexdigest()if f.exists()else None
 d['baselineIds'].append(id)
d['baselineIds']=sorted(d['baselineIds']);d['additionIds']=[id for id in d['additionIds']if id not in old]
p.write_text(json.dumps(d,indent=2)+'\n')
(root/'evidence/release-baseline-transition.json').write_text(json.dumps({'movedPublishedIds':old,'newAdditionIds':d['additionIds'],'policy':'Only already published IDs move to baseline. Pre-run live analysis hashes retained; refreshed analyses remain unfrozen.'},indent=2)+'\n')
print('Published additions promoted to baseline:',len(old),'new additions:',len(d['additionIds']))
