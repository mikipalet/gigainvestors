from pathlib import Path
import hashlib,json,sys
root=Path(sys.argv[1]);live=Path('/Users/miki/value-corpus');copy=root/'corpus';out=Path(sys.argv[2]);rows=[];changed=[]
for p in sorted((live/'publish-repo').rglob('*')):
 if not p.is_file() or '.git' in p.parts:continue
 rel=p.relative_to(live);other=copy/rel
 a=hashlib.sha256(p.read_bytes()).hexdigest();b=hashlib.sha256(other.read_bytes()).hexdigest() if other.exists() else None
 rows.append({'path':str(rel),'sha256':a,'copiedSha256':b})
 if a!=b:changed.append(str(rel))
freeze=live/'verdict-freeze.json';f=json.loads(freeze.read_text());freeze_match=freeze.read_bytes()==(copy/'verdict-freeze.json').read_bytes()
shared=[];symlinks=[]
# No link in the fresh namespace may resolve into live; compare inode identities
# for every copied regular file, including the dereferenced coverage inputs.
for p in copy.rglob('*'):
 if p.is_symlink():symlinks.append(str(p))
 if not p.is_file():continue
 q=live/p.relative_to(copy)
 if q.is_file() and (p.stat().st_dev,p.stat().st_ino)==(q.stat().st_dev,q.stat().st_ino):shared.append(str(p.relative_to(copy)))
result={'archiveFiles':len(rows),'changed':changed,'freezeUnchanged':freeze_match,'freezeSha256':hashlib.sha256(freeze.read_bytes()).hexdigest(),'copySymlinks':symlinks,'copyInodesSharedWithLive':shared,'files':rows}
(out/'archive-proof.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='files'},indent=2));assert not changed and freeze_match and not shared and not symlinks
