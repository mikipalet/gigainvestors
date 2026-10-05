import os,json,hashlib
from pathlib import Path
root=Path(os.environ['PUBFIX_ROOT']);live=Path.home()/'value-corpus';dest=root/'corpus'
missing=[];shared=[];mismatched=[];symlinks=[];files=0;size=0
for parent,dirs,names in os.walk(live,followlinks=True):
 rel=Path(parent).relative_to(live)
 if rel==Path('.'):dirs[:]=[d for d in dirs if d!='daily-runner.lock']
 for name in names:
  a=Path(parent)/name;b=dest/rel/name
  if not a.is_file():continue
  if not b.is_file():missing.append(str(rel/name));continue
  sa,sb=a.stat(),b.stat();files+=1;size+=sa.st_size
  if (sa.st_dev,sa.st_ino)==(sb.st_dev,sb.st_ino):shared.append(str(rel/name))
  if sa.st_size!=sb.st_size or sa.st_mtime_ns!=sb.st_mtime_ns:mismatched.append(str(rel/name))
  if b.is_symlink():symlinks.append(str(rel/name))
result={'files':files,'bytes':size,'missing':missing,'sizeOrMtimeDifferences':mismatched,'sharedLiveInodes':shared,'fileSymlinks':symlinks,'excluded':['daily-runner.lock']}
(root/'evidence/copy-audit.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result));assert not missing and not shared and not mismatched and not symlinks
