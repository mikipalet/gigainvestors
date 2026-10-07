"""Compare the two failed snapshots; equality does not imply release validity."""
from pathlib import Path
import json,subprocess
r=Path('/Users/miki/data/value-rules/.audit/rules-5');e=r/'evidence';real=r/'corpus/publish-repo';out=r/'candidate-final';mismatches=[];n=0
for directory in ['index','dossiers','search']:
 for p in(out/directory).glob('*.json'):
  q=real/directory/p.name
  if not q.exists():mismatches.append(directory+'/'+p.name);continue
  a,b=json.loads(p.read_text()),json.loads(q.read_text())
  if directory=='dossiers':
   for records in [a,b]:
    for d in records.values():
     if d.get('priceStory'):d['priceStory'].pop('asOf',None)
  if a!=b:mismatches.append(directory+'/'+p.name)
  n+=1
result={'failedSnapshotsOnly':True,'comparedCoreFiles':n,'differentCoreFiles':mismatches,'ignored':'priceStory.asOf run-clock timestamps only','ordinaryExit':(e/'publish-out-final.exit').read_text().strip(),'realExit':(e/'publish-real.exit').read_text().strip(),'interpretation':'A matching failed snapshot is still NOT publishable. Both production guards and all failure logs remain authoritative.'}
(e/'failed-publish-comparison.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
