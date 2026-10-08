"""Classify end-of-run live drift: a real content change fails; a dangling link to a deleted
directory is restored from the bound copy by the release overlay."""
import hashlib,json,os
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-7');e=r/'evidence';live=Path('/Users/miki/value-corpus')
check=json.loads((e/'input-integrity.json').read_text());source=json.loads((e/'source-baseline.json').read_text())
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
dangling,changed,restorable=[],[],[]
for rel in check['sourceMismatches']:
 p=live/rel
 if p.is_symlink()and not p.exists():
  dangling.append({'path':rel,'target':os.readlink(p)})
  copy=r/'corpus'/rel
  if copy.is_file()and digest(copy)==source[rel]:restorable.append(rel)
 elif not p.exists():dangling.append({'path':rel,'target':None})
 else:changed.append(rel)
added=[{'path':rel,'target':os.readlink(live/rel)if(live/rel).is_symlink()else None,'exists':(live/rel).exists()}for rel in check['sourceAdditions']]
out={'archiveUnchanged':not check['archiveMismatches'],'archiveCommit':check['archiveCommit'],'contentChanged':changed,'danglingBoundInputs':len(dangling),
 'restorableFromBoundCopy':len(restorable),'danglingAtBind':[a for a in added if not a['exists']],'newRealFiles':[a for a in added if a['exists']],
 'cause':'No bound input changed or dangled.' if not dangling else 'Live corpus files were symlinks into /mnt/HC_Volume_107024928/value-cover, which was deleted outside this task; content survives only in the bound copy.',
 'restore':sorted(restorable)}
(e/'end-bindings.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({k:(len(v)if isinstance(v,list)else v)for k,v in out.items()}))
assert out['archiveUnchanged']and not changed and not out['newRealFiles']and len(restorable)==len(dangling)
