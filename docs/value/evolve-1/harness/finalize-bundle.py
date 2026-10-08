"""Bind the reviewed, cleaned handoff to the final local code commit."""
import hashlib,json,shutil,subprocess,tarfile
from pathlib import Path
repo=Path('/Users/miki/data/value-evolve');e=repo/'.audit/evolve-1/evidence';b=repo/'release-bundle-evolve-1'
read=lambda p:json.loads(p.read_text())
assert read(e/'verification.json')['passed']and read(e/'cleanup.json')['complete']
assert not subprocess.check_output(['git','diff','HEAD','--name-only'],cwd=repo,text=True).strip()
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
log=subprocess.check_output(['git','log','--format=%s','-3'],cwd=repo,text=True).splitlines()
assert "value: 3.7.0 follows Buffett and Munger's latest views" in log
for name in ['report.md','controller-commands.md']:shutil.copy2(repo/'docs/value/evolve-1'/name,e/name)
with tarfile.open(b/'evidence.tar.gz','w:gz',compresslevel=1)as archive:
 for p in sorted(e.rglob('*')):
  if p.is_file()and p.suffix!='.pid'and p.name!='source-baseline.json':archive.add(p,arcname='evidence/'+str(p.relative_to(e)),recursive=False)
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
m=read(b/'manifest.json');m.update(status='READY',codeCommit=commit,releaseCommit=subprocess.check_output(['git','rev-parse','bea73f6'],cwd=repo,text=True).strip(),originMasterMerged=subprocess.check_output(['git','rev-parse','ecc27a1'],cwd=repo,text=True).strip(),reason='All local release gates pass. No deployment, push or external publication executed. rules-7 not yet on master: controller must verify origin/master is an ancestor of codeCommit.',publicationAuthorization='Not granted or executed; future controller procedure only')
m['artifacts']={p.name:digest(p)for p in sorted(b.iterdir())if p.is_file()and p.name!='manifest.json'}
(b/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
print(json.dumps({'status':m['status'],'codeCommit':commit,'heldBuyTransitions':m['heldBuyTransitions'],'artifacts':len(m['artifacts'])}))
