"""Bind the verified handoff to the final local code commit."""
import hashlib,json,shutil,subprocess,tarfile
from pathlib import Path
repo=Path('/Users/miki/data/value-rules');e=repo/'.audit/rules-7/evidence';b=repo/'release-bundle-rules-7'
read=lambda p:json.loads(p.read_text())
assert not subprocess.check_output(['git','status','--porcelain','--untracked-files=no'],cwd=repo,text=True).strip()
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
assert subprocess.check_output(['git','log','-1','--format=%s'],cwd=repo,text=True).strip()=='value: buy verdicts follow the data'
assert not (repo/'scripts/value/approved-verdict-changes.json').exists()
for name in ['controller-commands.md']:shutil.copy2(repo/'docs/value/rules-7'/name,b/name)
with tarfile.open(b/'evidence.tar.gz','w:gz',compresslevel=1)as archive:
 for p in sorted(e.rglob('*')):
  if p.is_file()and p.suffix!='.pid'and p.name!='source-baseline.json':archive.add(p,arcname='evidence/'+str(p.relative_to(e)),recursive=False)
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
m=read(b/'manifest.json');m.update(status='READY',codeCommit=commit,reason='All local release gates pass; Buy verdicts follow the computed data. No deployment, push or external publication executed.',publicationAuthorization='Not granted or executed; future controller procedure only')
m['artifacts']={p.name:digest(p)for p in sorted(b.iterdir())if p.is_file()and p.name!='manifest.json'}
(b/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
print(json.dumps({'status':m['status'],'codeCommit':commit,'method':m['method'],'artifacts':len(m['artifacts'])}))
