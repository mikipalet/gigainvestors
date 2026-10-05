import os,json,shutil,subprocess,hashlib
from pathlib import Path
root=Path(os.environ['PUBFIX_ROOT']);corpus=root/'corpus';repo=corpus/'publish-repo'
assert not (root/'evidence/DISK_STOP').exists()
assert not any(p.is_symlink() for p in corpus.rglob('*')), 'Copy must have no symlinks'
# Preserve the exact initial working snapshot separately from its committed tree.
shutil.copytree(repo,root/'baseline',ignore=shutil.ignore_patterns('.git'))
run=lambda *args:subprocess.check_output(args,text=True,stderr=subprocess.PIPE).strip()
head=run('/usr/bin/git','-C',str(repo),'rev-parse','HEAD')
run('/usr/bin/git','clone','--bare','--no-hardlinks',str(repo),str(root/'storage/remote.git'))
for args in [['remote','set-url','origin',str(root/'storage/remote.git')],['remote','set-url','--push','origin',str(root/'storage/remote.git')],['config','core.hooksPath','/dev/null']]:
 run('/usr/bin/git','-C',str(repo),*args)
for location in [repo,root/'storage/remote.git']:
 for key,value in [('pack.threads','1'),('pack.windowMemory','64m'),('pack.deltaCacheSize','64m')]:run('/usr/bin/git','-C',str(location),'config',key,value)
(root/'evidence/setup.json').write_text(json.dumps({'sourceHead':head,'localOrigin':str(root/'storage/remote.git'),'symlinks':0,'freezeSha256':hashlib.sha256((corpus/'verdict-freeze.json').read_bytes()).hexdigest(),'freezeIds':len(json.loads((corpus/'verdict-freeze.json').read_text())['ids'])},indent=2)+'\n')
print('Local bare origin and baseline ready; source commit',head)
