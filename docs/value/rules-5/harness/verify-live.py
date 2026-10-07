"""Recheck every copied input and archive byte against the read-only live source."""
import hashlib,json,time
from concurrent.futures import ThreadPoolExecutor
from itertools import islice
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-5');live=Path('/Users/miki/value-corpus');e=r/'evidence'
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
started=time.time();source=json.loads((e/'source-baseline.json').read_text());archive=json.loads((e/'archive-baseline.json').read_text())
def mismatches(base,entries):
 def check(item):
  rel,want=item;p=base/rel
  return rel if not p.is_file()or digest(p)!=want else None
 changes=[];items=iter(entries.items())
 # Bounded I/O concurrency; every bound file is still hashed in full.
 with ThreadPoolExecutor(max_workers=8)as pool:
  while batch:=list(islice(items,256)):
   assert not(e/'DISK_STOP').exists(),'DISK STOP'
   changes.extend(rel for rel in pool.map(check,batch)if rel is not None)
 return sorted(changes)
changed=mismatches(live,source)
changedArchive=mismatches(live/'publish-repo',archive['files'])
result={'sourceFiles':len(source),'sourceMismatches':changed,'archiveFiles':len(archive['files']),'archiveMismatches':changedArchive,'sourceReadOnly':True,'holdAndRunnerLock':'never opened or modified','seconds':time.time()-started}
(e/'input-integrity.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));assert not changed and not changedArchive
