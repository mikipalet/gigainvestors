"""After the review commit, bind retained artifacts without external release."""
from pathlib import Path
import json,hashlib,tarfile,subprocess,shutil
repo=Path('/Users/miki/data/value-rules');e=repo/'.audit/rules-5/evidence';b=repo/'release-bundle-rules-5'
read=lambda p:json.loads(p.read_text())
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
subprocess.run(['git','diff','--exit-code'],check=True);subprocess.run(['git','diff','--cached','--exit-code'],check=True)
commit=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();v=read(e/'verification.json');assert v['complete']and read(e/'cleanup.json')['complete']
assert subprocess.check_output(['git','show','-s','--format=%s','HEAD'],text=True).strip()=='value: valuation rules reviewed'
assert not v['releaseReady'],'This task recorded concurrent source drift; do not relabel stale bindings READY'
for name in ['report.md','controller-commands.md','changelog.md','cleanup.json']:shutil.copy2(repo/'docs/value/rules-5'/name,b/name)
delivery={'status':'NOT','codeCommit':commit,'branch':'value-rules','method':'3.5.0','reason':f"Ordinary and REAL publication fail on missing canonical dossiers RACE.MI/STLAM.MI; {v['sourceDriftCount']} source files also drifted. Fresh successful proof required before installation.",'approvedBuyChanges':0,'ruleChanges':0,'externalPush':False,'externalPublication':False,'corpusCopiesDeleted':True}
(b/'delivery.json').write_text(json.dumps(delivery,indent=2)+'\n')
with tarfile.open(b/'evidence.tar.gz','w:gz',compresslevel=1)as t:
 for p in sorted(e.rglob('*')):
  if p.is_file()and p.suffix!='.pid'and p.name!='source-baseline.json':t.add(p,arcname='evidence/'+str(p.relative_to(e)),recursive=False)
m=read(b/'manifest.json');m.update({'status':'NOT','reason':delivery['reason'],'codeCommit':commit,'codeTree':subprocess.check_output(['git','rev-parse','HEAD^{tree}'],text=True).strip(),'localGatesPassed':v['passed'],'sourceDriftCount':v['sourceDriftCount'],'artifacts':{p.name:digest(p)for p in b.iterdir()if p.is_file()and p.name!='manifest.json'}})
(b/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
owner=Path('/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/rules-5-report.md');owner.write_text((repo/'docs/value/rules-5/report.md').read_text()+f'\nDelivery commit: `{commit}` on `value-rules`. Bundle status: NOT (publication failure and source drift).\n')
print(json.dumps(delivery,indent=2))
