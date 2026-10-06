"""Recheck every copied input and archive byte against the read-only live source."""
import hashlib,json,time
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-3');live=Path('/Users/miki/value-corpus');e=r/'evidence'
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
started=time.time();source=json.loads((e/'source-baseline.json').read_text());archive=json.loads((e/'archive-baseline.json').read_text());changed=[]
for rel,want in source.items():
 p=live/rel
 if not p.is_file()or digest(p)!=want:changed.append(rel)
changedArchive=[]
for rel,want in archive['files'].items():
 p=live/'publish-repo'/rel
 if not p.is_file()or digest(p)!=want:changedArchive.append(rel)
result={'sourceFiles':len(source),'sourceMismatches':changed,'archiveFiles':len(archive['files']),'archiveMismatches':changedArchive,'sourceReadOnly':True,'holdAndRunnerLock':'never opened or modified','seconds':time.time()-started}
(e/'input-integrity.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));assert not changed and not changedArchive
