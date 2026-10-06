"""Verify the sole intentional copy-audit difference after local-origin setup."""
import configparser,json,os
from pathlib import Path
root=Path(os.environ['PUBFIX_ROOT']);p=root/'evidence/copy-audit.json';r=json.loads(p.read_text())
assert not r['missing'] and not r['sharedLiveInodes'] and not r['fileSymlinks']
assert r['sizeOrMtimeDifferences']==['publish-repo/.git/config']
def config(path):
 c=configparser.ConfigParser();c.read(path);return {s:dict(c[s]) for s in c.sections()}
a=config(Path.home()/'value-corpus/publish-repo/.git/config');b=config(root/'corpus/publish-repo/.git/config')
a.setdefault('remote "origin"',{}).update(url=str(root/'storage/remote.git'),pushurl=str(root/'storage/remote.git'))
a.setdefault('core',{})['hookspath']='/dev/null'
a.setdefault('pack',{}).update(threads='1',windowmemory='64m',deltacachesize='64m')
assert a==b,'Unexpected git config mutation'
r['verifiedHarnessDifferences']=r.pop('sizeOrMtimeDifferences');r['unexpectedDifferences']=[]
p.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
