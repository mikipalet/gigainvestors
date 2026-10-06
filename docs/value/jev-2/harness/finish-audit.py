import os,json,subprocess,hashlib
from pathlib import Path
root=Path(os.environ['PUBFIX_ROOT']);e=root/'evidence'
run=lambda *a:subprocess.check_output(a,text=True,stderr=subprocess.PIPE).strip()
initial=json.loads((e/'setup.json').read_text())
repo=root/'corpus/publish-repo'
result={'initialHead':initial['sourceHead'],'localHead':run('/usr/bin/git','-C',str(repo),'rev-parse','HEAD'),'bareHead':run('/usr/bin/git','--git-dir',str(root/'storage/remote.git'),'rev-parse','refs/heads/main'),'sourceHead':run('/usr/bin/git','-C',str(Path.home()/'value-corpus/publish-repo'),'rev-parse','HEAD'),'pendingReceipt':(repo/'.git/value-publish-pending.json').exists(),'realExit':int((e/'real-publish.exit').read_text()),'sourceFreezeSha256':hashlib.sha256((Path.home()/'value-corpus/verdict-freeze.json').read_bytes()).hexdigest(),'initialFreezeSha256':initial['freezeSha256']}
(e/'final-audit.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
assert result['sourceHead']==result['initialHead'] and result['sourceFreezeSha256']==result['initialFreezeSha256']
