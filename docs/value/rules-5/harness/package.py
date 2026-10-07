"""Package this task only; preserve the owner's existing rules-3 release bundle."""
from pathlib import Path
import json,hashlib,tarfile,shutil,subprocess
r=Path('/Users/miki/data/value-rules/.audit/rules-5');e=r/'evidence';c=r/'corpus';out=Path('/Users/miki/data/value-rules/release-bundle-rules-5');out.mkdir(exist_ok=True)
read=lambda p:json.loads(p.read_text())
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
assert min(shutil.disk_usage(p).free for p in ['/','/Users/miki/data'])>=4*1024**3
source=read(e/'source-baseline.json');final=dict(source);files={};failed={v['id']for v in read(e/'retained-cache-failures.json')}
for directory in ['analysis','bonds']:
 for p in(c/directory).rglob('*.json'):
  rel=str(p.relative_to(c));h=digest(p)
  if h==source.get(rel):continue
  assert not(rel.startswith('analysis/')and p.stem in failed),'Failed cache would enter overlay'
  files[rel]=h;final[rel]=h
p=c/'held-membership/release.json';rel=str(p.relative_to(c));h=digest(p)
if h!=source.get(rel):files[rel]=h;final[rel]=h
with tarfile.open(out/'corpus-overlay.tar.gz','w:gz',compresslevel=1)as t:
 for rel in sorted(files):t.add(c/rel,arcname=rel,recursive=False)
(out/'analyzed-source-hashes.json').write_text(json.dumps(final,separators=(',',':'))+'\n');shutil.copy2(e/'archive-baseline.json',out/'archive-baseline.json')
shutil.copy2('scripts/value/approved-verdict-changes.json',out/'approved-verdict-changes.json')
shutil.copy2(e/'proposed-buy-approvals.json',out/'proposed-buy-approvals.json')
shutil.copy2('research/valuation/outputs/rejected-experimental-buy-proposals.json',out/'rejected-experimental-buy-proposals.json')
with tarfile.open(out/'candidate.tar.gz','w:gz',compresslevel=1)as t:t.add(r/'candidate-final',arcname='candidate')
with tarfile.open(out/'evidence.tar.gz','w:gz',compresslevel=1)as t:
 for p in sorted(e.rglob('*')):
  if p.is_file()and p.suffix!='.pid'and p.name!='source-baseline.json':t.add(p,arcname='evidence/'+str(p.relative_to(e)),recursive=False)
manifest={'version':1,'status':'NOT','reason':'Final verification and code-commit binding pending. No economic correction selected; zero approved buy flips.','method':'3.5.0','pipeline':'29','baselineCommit':read(e/'archive-baseline.json')['commit'],'baseCode':'800a81697a704e8a25f197bed751f9f32facfa1d','overlayFiles':files,'failedCacheIds':sorted(failed),'sourceFiles':len(final),'sourceBytes':sum((c/rel).stat().st_size for rel in final),'ownerApprovalRequired':False,'approvalManifestSha256':digest(out/'approved-verdict-changes.json'),'artifacts':{p.name:digest(p)for p in out.iterdir()if p.is_file()and p.name!='manifest.json'}}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps({'overlayFiles':len(files),'sourceFiles':len(final),'failedCacheIds':len(failed),'bundleBytes':sum(p.stat().st_size for p in out.iterdir()if p.is_file())}))
