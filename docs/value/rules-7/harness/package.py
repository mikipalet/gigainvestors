"""Release bundle: every corpus file changed or removed since the bound live snapshot, plus evidence."""
import hashlib,json,os,shutil,tarfile
from pathlib import Path
repo=Path('/Users/miki/data/value-rules');r=repo/'.audit/rules-7';c=r/'corpus';e=r/'evidence';out=repo/'release-bundle-rules-7'
out.mkdir(exist_ok=True)
read=lambda p:json.loads(p.read_text())
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
source=read(e/'source-baseline.json');bound=(e/'source-baseline.json').stat().st_mtime-3600
files={};present=set()
for base,dirs,names in os.walk(c):
 dirs[:]=[d for d in dirs if d!='.git']
 for name in names:
  p=Path(base)/name;rel=str(p.relative_to(c))
  if rel.startswith(('publish-repo/','staging/','logs/','tmp/')):continue
  present.add(rel)
  # Unmodified copies keep their rsync mtime; hash every file touched after binding.
  if rel in source and p.stat().st_mtime<bound:continue
  value=digest(p)
  if value!=source.get(rel):files[rel]=value
removed=sorted(rel for rel in source if rel not in present and not rel.startswith(('publish-repo/','staging/','logs/')))
assert 'verdict-freeze.json' in files,'Release freeze overlay missing'
# Bound inputs whose live files became dangling links after binding: restore the analysed bytes.
restored=read(e/'end-bindings.json')['restore']
for rel in restored:
 assert rel not in files and digest(c/rel)==source[rel]
 files[rel]=source[rel]
final={k:v for k,v in source.items() if k not in removed};final.update(files)
with tarfile.open(out/'corpus-overlay.tar.gz','w:gz')as archive:
 for rel in sorted(files):
  archive.inodes.clear()  # hardlinked dedupe copies must be stored as regular files
  archive.add(c/rel,arcname=rel,recursive=False)
(out/'analyzed-source-hashes.json').write_text(json.dumps(final,separators=(',',':'))+'\n')
(out/'removed-files.json').write_text(json.dumps(removed,indent=1)+'\n')
for name in ['archive-baseline.json']:shutil.copy2(e/name,out/name)
shutil.copy2(c/'verdict-freeze.json',out/'verdict-freeze.json')
shutil.copy2(repo/'docs/value/rules-7/evidence/freeze-review.json',out/'freeze-review.json')
with tarfile.open(out/'candidate.tar.gz','w:gz',compresslevel=1)as archive:archive.add(r/'candidate-final',arcname='candidate')
with tarfile.open(out/'evidence.tar.gz','w:gz',compresslevel=1)as archive:
 for p in sorted(e.rglob('*')):
  if p.is_file()and p.suffix!='.pid'and p.name!='source-baseline.json':archive.add(p,arcname='evidence/'+str(p.relative_to(e)),recursive=False)
method=[l for l in (repo/'lib/value/method-version.ts').read_text().splitlines() if "version: '" in l][0].split("version: '")[1].split("'")[0]
manifest={'version':1,'status':'NOT','reason':'Final verification and commit binding pending.','method':method,'baselineCommit':read(e/'archive-baseline.json')['commit'],
 'overlayFiles':files,'restoredFiles':restored,'removedFiles':removed,'sourceFiles':len(final),'approvalManifest':None,'buyVerdicts':'computed from data; no approval manifest',
 'frozenIds':read(c/'verdict-freeze.json')['ids'],
 'artifacts':{p.name:digest(p)for p in sorted(out.iterdir())if p.is_file()and p.name!='manifest.json'}}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'overlayFiles':len(files),'removedFiles':len(removed),'sourceFiles':len(final),'artifactBytes':sum(p.stat().st_size for p in out.iterdir())}))
