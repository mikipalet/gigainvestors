"""Retain a reviewable release bundle, not a second full corpus copy."""
import json,hashlib,tarfile,re,shutil
from pathlib import Path
root=Path.home()/'data/regress';corpus=root/'corpus';out=root/'release-bundle';out.mkdir(exist_ok=True)
def load(p):return json.loads(p.read_text())
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
held=load(root/'evidence/held-input-install.json');paths=set(held['copied'])
paths.update(r['path']for r in load(root/'evidence/bound-reading-repairs.json'))
paths.update(['universe.jsonl','held-membership/release.json'])
paths.update('prices/'+id.rsplit('.',1)[1]+'.json'for id in held['accepted'])
failed=set()
for group in ['released','remaining']:
 log=(root/f'evidence/analyze-complete-{group}.log').read_text()
 failed.update(re.findall(r'^analyze: (\S+): Cached reading unavailable',log,re.M))
 for id in load(root/f'evidence/{group}-ids.json'):
  p=corpus/f'analysis/{id}.json'
  if id in failed or not p.exists():continue
  a=load(p)
  if a.get('versions',{}).get('pipeline')!='29':continue
  for rel in [f'analysis/{id}.json',f'analysis/inputs/{id}.json',f'analysis/fingerprints/{id}.json']:
   if(corpus/rel).exists():paths.add(rel)
files={rel:digest(corpus/rel)for rel in sorted(paths)}
with tarfile.open(out/'corpus-overlay.tar.gz','w:gz',compresslevel=6)as archive:
 for rel in sorted(paths):archive.add(corpus/rel,arcname=rel,recursive=False)
quotes=load(Path.home()/'data/value-holds/handoff/reviewed-quotes.json')
(out/'held-quotes.json').write_text(json.dumps({id:quotes[id]for id in held['accepted']},indent=2)+'\n')
shutil.copy2(root/'evidence/live-baseline.json',out/'archive-baseline.json')
# Inputs that could invalidate the bound analysis. The controller must match
# these after applying the scoped overlay, or repeat the full proof.
sources=load(root/'evidence/analyzed-source-hashes.json')
sources.update(load(root/'evidence/supporting-source-hashes.json'))
(out/'analyzed-source-hashes.json').write_text(json.dumps(sources,separators=(',',':'))+'\n')
if(root/'candidate-final/meta.json').exists():
 with tarfile.open(out/'candidate.tar.gz','w:gz',compresslevel=6)as archive:archive.add(root/'candidate-final',arcname='candidate')
with tarfile.open(out/'evidence.tar.gz','w:gz',compresslevel=6)as archive:
 for p in sorted((root/'evidence').rglob('*')):
  if p.is_file()and p.suffix!='.pid'and p.name not in ['candidate-value.html']:archive.add(p,arcname=str(p.relative_to(root)),recursive=False)
manifest={'version':1,'status':'NOT','reason':'Controller review and all final gates must be cleared; this bundle grants no approval.','pipeline':'29','baselineCommit':load(root/'evidence/setup.json')['sourceHead'],'overlayFiles':files,'failedCacheIds':sorted(failed),'sourceFiles':len(sources),'artifacts':{p.name:digest(p)for p in sorted(out.iterdir())if p.is_file()and p.name!='manifest.json'}}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'overlayFiles':len(files),'sourceFiles':len(sources),'artifacts':{p.name:p.stat().st_size for p in out.iterdir()if p.is_file()}}))
