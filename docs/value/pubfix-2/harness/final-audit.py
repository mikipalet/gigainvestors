import os,json,hashlib,subprocess
from pathlib import Path
root=Path(os.environ['PUBFIX_ROOT']);ev=root/'evidence';repo=root/'corpus/publish-repo'
def read(name):return json.loads((ev/name).read_text())
def git(p,*args):return subprocess.check_output(['git','-C',str(p),*args],text=True).strip()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
proof=read('comparison.json');real=read('real-byte-proof.json');nightly=read('nightly-byte-proof.json')
checks=[read('real-live-check.json'),read('nightly-live-check.json')]
assert real['equal'] and nightly['equal'] and real['sha256']==nightly['sha256']
assert all(c['passed'] and not c['pageErrors'] for c in checks)
assert not (repo/'.git/value-publish-pending.json').exists()
assert not git(repo,'status','--porcelain')
assert git(repo,'rev-parse','HEAD')==git(root/'storage/remote.git','rev-parse','main')==checks[-1]['after']
unit=(ev/'unit-full.log').read_text();assert 'Test Files  236 passed (236)' in unit and 'Tests  2303 passed | 1 skipped (2304)' in unit
assert 'publish: 3892 companies, replaced data snapshot' in (ev/'real-publish.log').read_text()
assert 'stage=publish status=ok exit=0' in (ev/'nightly.log').read_text()
assert 'Finished TypeScript' in (ev/'build.log').read_text() and 'Build error occurred' not in (ev/'build.log').read_text()
source=Path.home()/'value-corpus';source_head=git(source/'publish-repo','rev-parse','HEAD')
assert source_head==(ev/'live-head-before.txt').read_text().strip()
freeze_sha=sha(source/'verdict-freeze.json');assert freeze_sha==sha(root/'corpus/verdict-freeze.json')==read('setup.json')['freezeSha256']
pointer=json.loads((root/'storage/blob/value/current.json').read_text());assert pointer['version']==real['sha256']
space=[json.loads(line)['free'] for line in (ev/'disk.jsonl').read_text().splitlines()]
min_free={key:min(row[key] for row in space) for key in space[0]};assert min(min_free.values())>4*1024**3
boundaries=[json.loads(line) for line in (ev/'boundaries.jsonl').read_text().splitlines()]
summary={'unitFilesPassed':236,'unitTestsPassed':2303,'unitTestsSkipped':1,'unitFailures':0,'productionBuild':'passed including TypeScript','standaloneRealPublish':'exit 0','nightlyPublishAvailable':'exit 0','snapshotFiles':real['files'],'snapshotBytes':real['bytes'],'snapshotSha256':real['sha256'],'blobPointerMatchesSnapshot':True,'bothLiveChecksPassed':True,'pendingReceiptCleared':True,'sourceHeadUnchanged':source_head,'freezeFileSha256Unchanged':freeze_sha,'minimumFreeBytes':min_free,'blobPutCalls':sum(x['kind']=='blob-put' for x in boundaries),'localRevalidationCalls':sum(x['kind']=='revalidate' for x in boundaries),'isolation':read('isolation.json')}
(ev/'verification.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
