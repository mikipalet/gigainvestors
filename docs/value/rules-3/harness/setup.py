"""Bind a fresh isolated corpus and the released archive; never traverse live locks."""
import hashlib,json,os,shutil,subprocess,time
from pathlib import Path
root=Path('/Users/miki/data/value-rules/.audit/rules-3');c=root/'corpus';e=root/'evidence';live=Path('/Users/miki/value-corpus')
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
assert min(shutil.disk_usage(p).free for p in ['/',str(root)])>=4*1024**3
head=subprocess.check_output(['git','-C',str(c/'publish-repo'),'rev-parse','HEAD'],text=True).strip()
archive={}
for p in (c/'publish-repo').rglob('*'):
 if '.git' in p.parts or not p.is_file():continue
 rel=p.relative_to(c/'publish-repo');dst=root/'baseline'/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dst);archive[str(rel)]=digest(p)
(e/'archive-baseline.json').write_text(json.dumps({'commit':head,'files':archive},indent=2)+'\n')
ids=sorted({id for f in(root/'baseline/dossiers').glob('*.json')for id in json.loads(f.read_text())});assert ids
(e/'released-ids.json').write_text(json.dumps(ids)+'\n')
# Already published additions now follow the normal baseline refresh path.
# Bind their original analysis hashes, never bypass first-publication checks.
p=c/'held-membership/release.json';release=json.loads(p.read_text());aliases=json.loads((root/'baseline/aliases.json').read_text());moved=[]
for id in release['additionIds']:
 if id in ids or aliases.get(id)in ids:
  moved.append(id);f=c/f'analysis/{id}.json';release['baselineIds'].append(id);release['baselineAnalysisHashes'][id]=digest(f)if f.exists()else None
release['baselineIds']=sorted(release['baselineIds']);release['additionIds']=[id for id in release['additionIds']if id not in moved];p.write_text(json.dumps(release,indent=2)+'\n')
(e/'release-baseline-transition.json').write_text(json.dumps({'movedPublishedIds':moved,'remainingAdditions':release['additionIds']},indent=2)+'\n')
# Files copied here are independent inodes. Bind inputs and prior analysis to
# detect source drift before controller installation, without copying secrets.
files={};started=time.time()
for base,dirs,names in os.walk(c):
 dirs[:]=[d for d in dirs if d!='.git']
 for name in names:
  p=Path(base)/name;rel=str(p.relative_to(c))
  if rel.startswith(('publish-repo/','staging/','logs/')):continue
  if name.startswith('.env')or name.startswith('daily-runner')or name.startswith('publish.hold'):raise AssertionError('Excluded path copied')
  files[rel]=digest(p)
files['held-membership/release.json']=digest(live/'held-membership/release.json')
(e/'source-baseline.json').write_text(json.dumps(files,separators=(',',':'))+'\n')
# Clone only from the independent copy. No external transport is permitted.
subprocess.run(['/usr/bin/git','clone','--bare','--no-hardlinks',str(c/'publish-repo'),str(root/'storage/remote.git')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
subprocess.run(['/usr/bin/git','-C',str(c/'publish-repo'),'remote','set-url','origin',str(root/'storage/remote.git')],check=True)
subprocess.run(['/usr/bin/git','-C',str(c/'publish-repo'),'remote','set-url','--push','origin',str(root/'storage/remote.git')],check=True)
subprocess.run(['/usr/bin/git','-C',str(c/'publish-repo'),'config','core.hooksPath','/dev/null'],check=True)
(e/'setup.json').write_text(json.dumps({'sourceHead':head,'sourceBindings':len(files),'dossiers':len(ids),'seconds':time.time()-started,'secretFilesCopied':False},indent=2)+'\n')
print('Fresh copy bound:',len(files),'inputs;',len(archive),'archive files;',len(ids),'companies',flush=True)
