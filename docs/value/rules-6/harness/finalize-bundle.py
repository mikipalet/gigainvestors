"""Bind the reviewed, cleaned handoff to the final local code commit."""
import hashlib,json,shutil,subprocess,tarfile
from pathlib import Path
repo=Path('/Users/miki/data/value-rules');e=repo/'.audit/rules-6/evidence';b=repo/'release-bundle-rules-6'
read=lambda p:json.loads(p.read_text())
assert read(e/'verification.json')['passed']and read(e/'cleanup.json')['complete']
assert not subprocess.check_output(['git','diff','HEAD','--name-only'],cwd=repo,text=True).strip()
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
assert subprocess.check_output(['git','log','-1','--format=%s'],cwd=repo,text=True).strip()=='value: 3.6.0 values owner earnings correctly'
for name in ['report.md','controller-commands.md']:shutil.copy2(repo/'docs/value/rules-6'/name,e/name)
with tarfile.open(b/'evidence.tar.gz','w:gz',compresslevel=1)as archive:
 for p in sorted(e.rglob('*')):
  if p.is_file()and p.suffix!='.pid'and p.name!='source-baseline.json':archive.add(p,arcname='evidence/'+str(p.relative_to(e)),recursive=False)
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
m=read(b/'manifest.json');m.update(status='READY',codeCommit=commit,reason='All local release gates pass with zero Buy changes. No deployment, push or external publication executed.',ownerApprovalRequired=False,publicationAuthorization='Not granted or executed; future controller procedure only')
m['artifacts']={p.name:digest(p)for p in sorted(b.iterdir())if p.is_file()and p.name!='manifest.json'}
assert read(repo/'scripts/value/approved-verdict-changes.json')==read(b/'approved-buy-changes.json')==[]
assert all(v['approved']is False for v in read(b/'proposed-buy-approvals.json'))
assert m['approvalManifestSha256']==digest(repo/'scripts/value/approved-verdict-changes.json')
assert m['proposalManifestSha256']==digest(b/'proposed-buy-approvals.json')
(b/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
print(json.dumps({'status':m['status'],'codeCommit':commit,'approvedBuyChanges':0,'proposedBuyChanges':m['proposedBuyCount'],'artifacts':len(m['artifacts'])}))
