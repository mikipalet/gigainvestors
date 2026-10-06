import hashlib,json,shutil
from pathlib import Path
root=Path.home()/'data/regress';source=Path.home()/'value-corpus';copy=root/'corpus'
files={}
for p in (source/'publish-repo').rglob('*'):
 if '.git'in p.parts or not p.is_file():continue
 rel=p.relative_to(source/'publish-repo');want=hashlib.sha256(p.read_bytes()).hexdigest()
 assert hashlib.sha256((copy/'publish-repo'/rel).read_bytes()).hexdigest()==want,str(rel)
 files[str(rel)]=want
for rel in ['verdict-freeze.json','held-membership/release.json','publish.hold']:
 assert (copy/rel).read_bytes()==(source/rel).read_bytes(),rel
(root/'evidence/live-baseline.json').write_text(json.dumps({'files':files,'freeze':hashlib.sha256((source/'verdict-freeze.json').read_bytes()).hexdigest(),'hold':hashlib.sha256((source/'publish.hold').read_bytes()).hexdigest()},indent=2)+'\n')
print('Live archive matches independent copy:',len(files),'files')
