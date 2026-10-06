"""Retain a review bundle containing only the changed overlay and evidence."""
import hashlib,json,tarfile,shutil
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-3');c=r/'corpus';e=r/'evidence';out=Path('/Users/miki/data/value-rules/release-bundle');out.mkdir(exist_ok=True)
read=lambda p:json.loads(p.read_text())
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
source=read(e/'source-baseline.json');final=dict(source);files={};failed={v['id']for v in read(e/'retained-cache-failures.json')}
paths=[p for directory in ['analysis','bonds']for p in(c/directory).rglob('*.json')]+[c/'held-membership/release.json']
for p in paths:
 rel=str(p.relative_to(c));value=digest(p)
 if value==source.get(rel):continue
 if rel.startswith('analysis/') and p.stem in failed:raise AssertionError('Failed cache installed: '+rel)
 files[rel]=value;final[rel]=value
with tarfile.open(out/'corpus-overlay.tar.gz','w:gz')as archive:
 for rel in sorted(files):archive.add(c/rel,arcname=rel,recursive=False)
(out/'analyzed-source-hashes.json').write_text(json.dumps(final,separators=(',',':'))+'\n')
shutil.copy2(e/'archive-baseline.json',out/'archive-baseline.json')
shutil.copy2(Path('scripts/value/approved-verdict-changes.json'),out/'proposed-buy-approvals.json')
with tarfile.open(out/'candidate.tar.gz','w:gz')as archive:archive.add(r/'candidate-final',arcname='candidate')
with tarfile.open(out/'evidence.tar.gz','w:gz')as archive:
 for p in sorted(e.rglob('*')):
  if p.is_file()and p.suffix not in ['.pid']and p.name not in ['source-baseline.json']:
   archive.add(p,arcname='evidence/'+str(p.relative_to(e)),recursive=False)
manifest={'version':1,'status':'NOT','reason':'Final verification and commit binding pending; controller approved zero Buy changes.','method':'3.5.0','pipeline':'29','baselineCommit':read(e/'archive-baseline.json')['commit'],'baseCode':read(e/'merged-master.json')['masterCommit'],'overlayFiles':files,'failedCacheIds':sorted(failed),'sourceFiles':len(final),'ownerApprovalRequired':False,'approvalManifestSha256':digest(out/'proposed-buy-approvals.json'),'artifacts':{p.name:digest(p)for p in sorted(out.iterdir())if p.is_file()and p.name!='manifest.json'}}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'overlayFiles':len(files),'sourceFiles':len(final),'failedCacheIds':len(failed),'artifactBytes':sum(p.stat().st_size for p in out.iterdir())}))
