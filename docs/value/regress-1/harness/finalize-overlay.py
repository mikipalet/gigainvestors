"""Include the reviewed held price cache used by the source hash binding."""
import json,tarfile,hashlib,os
from pathlib import Path
r=Path.home()/'data/regress';out=r/'release-bundle';m=json.loads((out/'manifest.json').read_text());rel='prices/US.json';p=r/'corpus'/rel
if rel not in m['overlayFiles']:
 temporary=out/'overlay-final.tmp.tar.gz'
 with tarfile.open(out/'corpus-overlay.tar.gz','r|gz')as old,tarfile.open(str(temporary),'w|gz',compresslevel=6)as new:
  for member in old:new.addfile(member,old.extractfile(member)if member.isfile()else None)
  new.add(p,arcname=rel,recursive=False)
 os.replace(temporary,out/'corpus-overlay.tar.gz')
 m['overlayFiles'][rel]=hashlib.sha256(p.read_bytes()).hexdigest()
h=hashlib.sha256()
with(out/'corpus-overlay.tar.gz').open('rb')as f:
 for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
m['artifacts']['corpus-overlay.tar.gz']=h.hexdigest();(out/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
print('Final overlay entries:',len(m['overlayFiles']))
