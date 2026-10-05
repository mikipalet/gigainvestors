import os,json,shutil,hashlib,subprocess
from pathlib import Path
root=Path(os.environ['PUBFIX_ROOT']).resolve();expected=(Path.home()/'data/pubfix-2').resolve()
assert root==expected and root.name=='pubfix-2'
verification=json.loads((root/'evidence/verification.json').read_text());assert verification['bothLiveChecksPassed'] and verification['pendingReceiptCleared']
assert not (root/'corpus/publish-repo/.git/value-publish-pending.json').exists()
(root/'evidence/done').touch()
for link,target in [(Path.cwd()/'.next',root/'build'),(Path('/tmp/value-pubfix-2-tmp'),root/'tmp')]:
 if link.is_symlink():
  assert link.resolve()==target;link.unlink()
removed=[]
for p in root.iterdir():
 if p.name=='evidence':continue
 removed.append(p.name)
 if p.is_symlink() or p.is_file():p.unlink()
 else:shutil.rmtree(p)
cache=Path('docs/value/pubfix-2/harness/__pycache__')
if cache.exists():shutil.rmtree(cache)
source=Path.home()/'value-corpus'
head=subprocess.check_output(['git','-C',str(source/'publish-repo'),'rev-parse','HEAD'],text=True).strip()
assert head==verification['sourceHeadUnchanged']
assert hashlib.sha256((source/'verdict-freeze.json').read_bytes()).hexdigest()==verification['freezeFileSha256Unchanged']
result={'removed':sorted(removed),'corpusCopyExists':(root/'corpus').exists(),'sourceHeadUnchanged':head,'freeAfterBytes':{p:shutil.disk_usage(p).free for p in ['/',str(Path.home()/'data')]}}
(root/'evidence/cleanup.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2));assert not result['corpusCopyExists']
