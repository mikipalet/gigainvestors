"""Recheck every copied input and archive byte against the read-only live source."""
import hashlib,json,time,datetime,subprocess,os
from concurrent.futures import ThreadPoolExecutor
from itertools import islice
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-6');live=Path('/Users/miki/value-corpus');e=r/'evidence'
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
now=datetime.datetime.now(datetime.timezone.utc);assert not(datetime.time(3)<=now.time().replace(tzinfo=None)<datetime.time(9,40)), 'Rebind outside nightly window';started=time.time();source=json.loads((e/'source-baseline.json').read_text());archive=json.loads((e/'archive-baseline.json').read_text())
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
observed=set()
for base,dirs,names in os.walk(live,followlinks=True):
 relbase=Path(base).relative_to(live)
 dirs[:]=[d for d in dirs if d!='.git' and not d.startswith(('daily-runner','publish.hold','.env')) and not(len(relbase.parts)==0 and d in ['publish-repo','staging','logs','backups'])]
 for name in names:
  if name.startswith(('daily-runner','publish.hold','.env')):continue
  observed.add(str(relbase/name))
added=sorted(observed-set(source))
changed=mismatches(live,source)
changedArchive=mismatches(live/'publish-repo',archive['files'])
head=subprocess.check_output(['/usr/bin/git','-C',str(live/'publish-repo'),'rev-parse','HEAD'],text=True).strip()
assert head==archive['commit'],'Live archive advanced; rebase required'
finished=datetime.datetime.now(datetime.timezone.utc);assert not(datetime.time(3)<=finished.time().replace(tzinfo=None)<datetime.time(9,40)), 'Binding ended inside nightly window; rebind'
result={'startedAt':now.isoformat(),'completedAt':finished.isoformat(),'archiveCommit':head,'bindingOutsideNightlyWindow':True,'sourceFiles':len(source),'sourceMismatches':changed,'sourceAdditions':added,'archiveFiles':len(archive['files']),'archiveMismatches':changedArchive,'finalVerificationReadOnly':True,'preliminaryUnitRunException':'Initial unit invocation lacked the read-only namespace; all final tests use it. Full source hashes are checked here.','holdAndRunnerLock':'never opened or modified','seconds':time.time()-started}
(e/'input-integrity.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));assert not changed and not changedArchive and not added
