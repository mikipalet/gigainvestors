import hashlib,json,os,shutil
from pathlib import Path
live=Path.home()/'value-corpus';root=Path.home()/'data/value-holds';out=root/'scratch/impact';out.mkdir(parents=True,exist_ok=True)
for volume in [Path('/'),root]:
 s=os.statvfs(volume);assert s.f_bavail*s.f_frsize>=4*1024**3,'DISK STOP: commit'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
manifest={str(p.relative_to(live/'publish-repo')):sha(p) for p in (live/'publish-repo').rglob('*') if p.is_file() and '.git' not in p.relative_to(live/'publish-repo').parts}
(root/'evidence/holds-2/live-before.json').write_text(json.dumps({'files':manifest,'freezeSha256':sha(live/'verdict-freeze.json')},indent=2)+'\n')
ids=set()
for p in (live/'publish-repo/dossiers').glob('*.json'):ids.update(json.loads(p.read_text()))
hashes={}
for id in sorted(ids):
 for rel in [f'analysis/{id}.json',f'companies/{id}.json',f'fundamentals/{id}.json',f'enrichment-v7/share-checks/{id}.json']:
  src=live/rel
  if src.exists():
   dst=out/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dst);hashes[rel]=sha(src)
for rel in ['publish-repo/dossiers','publish-repo/prices']:
 shutil.copytree(live/rel,out/rel,dirs_exist_ok=True)
shutil.copyfile(live/'verdict-freeze.json',out/'verdict-freeze.json')
(out/'held-membership').mkdir(exist_ok=True)
shutil.copyfile(live/'held-membership/release.json',out/'held-membership/release.json')
(out/'raw/eodhd/universe').mkdir(parents=True,exist_ok=True)
for src in (live/'raw/eodhd/universe').glob('fx-*.json'):
 shutil.copyfile(src,out/'raw/eodhd/universe'/src.name)
(root/'evidence/holds-2/impact-input-hashes.json').write_text(json.dumps(hashes,indent=2)+'\n')
print(json.dumps({'liveIds':len(ids),'copiedInputs':len(hashes),'archiveFiles':len(manifest)}))
