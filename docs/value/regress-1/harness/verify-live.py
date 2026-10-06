import json,hashlib
from pathlib import Path
r=Path.home()/'data/regress';live=Path.home()/'value-corpus';d=json.loads((r/'evidence/live-baseline.json').read_text())
changed=[]
for f,want in d['files'].items():
 p=live/'publish-repo'/f
 if not p.exists()or hashlib.sha256(p.read_bytes()).hexdigest()!=want:changed.append(f)
actual={str(p.relative_to(live/'publish-repo'))for p in (live/'publish-repo').rglob('*')if p.is_file()and '.git'not in p.parts}
result={'archiveFilesChecked':len(d['files']),'changed':changed,'added':sorted(actual-set(d['files'])),'holdUnchanged':hashlib.sha256((live/'publish.hold').read_bytes()).hexdigest()==d['hold'],'freezeUnchanged':hashlib.sha256((live/'verdict-freeze.json').read_bytes()).hexdigest()==d['freeze']}
(r/'evidence/live-final.json').write_text(json.dumps(result,indent=2)+'\n')
print(result)
assert not changed and not result['added']and result['holdUnchanged']and result['freezeUnchanged']
