"""Bind the cleaned, verified local handoff to its final code commit.

READY describes technical gates only. Owner Buy approval remains required.
"""
import hashlib,json,shutil,subprocess,tarfile
from pathlib import Path
repo=Path('/Users/miki/data/value-rules');e=repo/'.audit/rules-2/evidence';b=repo/'release-bundle'
read=lambda p:json.loads(p.read_text())
assert read(e/'verification.json')['passed']and read(e/'cleanup.json')['complete']
assert not subprocess.check_output(['git','status','--porcelain'],cwd=repo,text=True).strip()
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
for name in ['report.md','controller-commands.md']:shutil.copy2(repo/'docs/value/rules-2'/name,e/name)
with tarfile.open(b/'evidence.tar.gz','w:gz',compresslevel=1)as archive:
 for p in sorted(e.rglob('*')):
  if p.is_file()and p.suffix!='.pid'and p.name!='source-baseline.json':archive.add(p,arcname='evidence/'+str(p.relative_to(e)),recursive=False)
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
m=read(b/'manifest.json');m.update(status='READY',codeCommit=commit,reason='All local technical gates pass. Exact owner Buy approval remains pending; no external publication authorized.',ownerApprovalRequired=True)
m['artifacts']={p.name:digest(p)for p in sorted(b.iterdir())if p.is_file()and p.name!='manifest.json'}
assert m['approvalManifestSha256']==digest(repo/'scripts/value/approved-verdict-changes.json')
(b/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
print(json.dumps({'status':m['status'],'codeCommit':commit,'ownerBuyApproval':'PENDING','artifacts':len(m['artifacts'])}))
