import hashlib,json,subprocess
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-3');e=r/'evidence';repo=r/'corpus/publish-repo'
read=lambda p:json.loads(p.read_text())
git=lambda p,*args:subprocess.check_output(['/usr/bin/git','-C',str(p),*args],text=True).strip()
for name in ['unit-final-isolated','build-candidate','publish-out-final','publish-real','post-check','final-types']:
 assert (e/(name+'.exit')).read_text().strip()=='0',name
assert read(e/'browser-comparison.json')['pass'];assert read(e/'price-gate-proof.json')['pass']
assert read(e/'browser-comparison.json')['qualitySurfaceAudits']==20
assert read(e/'browser-comparison.json')['priceSurfaceAudits']==10
assert read(e/'bundle-integrity.json')['passed']
browserIsolation=[json.loads(line)for line in(e/'browser-store-isolation.jsonl').read_text().splitlines()]
assert len(browserIsolation)>=2 and len({row['buildId']for row in browserIsolation[-2:]})==1
assert read(e/'diagnostic-basis-proof.json')['passed']
archive=read(e/'live-archive-final.json');assert not archive['changed']and archive['matchesBoundCommit']
assert not(repo/'.git/value-publish-pending.json').exists();assert not git(repo,'status','--porcelain')
assert git(repo,'rev-parse','HEAD')==git(r/'storage/remote.git','rev-parse','main')
check=read(e/'live-check.json');assert check['passed']and not check['pageErrors']
pointer=read(r/'storage/blob/value/current.json');blob=r/'storage/blob/value/versions'/pointer['version'];h=hashlib.sha256();size=0;n=0
for p in sorted(p for p in blob.rglob('*')if p.is_file()):
 rel=p.relative_to(blob).as_posix();data=(repo/rel).read_bytes();assert data==p.read_bytes(),rel
 h.update((rel+'\0'+hashlib.sha256(data).hexdigest()+'\n').encode());size+=len(data);n+=1
assert h.hexdigest()==pointer['version']
# Only run-clock price-story timestamps can differ between two ordinary runs.
core=0
for directory in ['index','dossiers','search']:
 for p in(r/'candidate-final'/directory).glob('*.json'):
  a,b=read(p),read(repo/directory/p.name)
  if directory=='dossiers':
   for records in [a,b]:
    for d in records.values():
     if d.get('priceStory'):d['priceStory'].pop('asOf',None)
  assert a==b,str(p);core+=1
inputs=read(e/'input-integrity.json');assert not inputs['sourceMismatches']and not inputs['archiveMismatches']
audit=read(e/'release-audit.json');assert audit['baselineDossiers']==audit['candidateDossiers']==len(read(e/'released-ids.json'))
assert not audit['missing']and not audit['added']and not audit['freezeChanges']and not audit['protectedChanges']
assert not audit['numericNulls']and not audit['numericRemoved']and not audit['valuationLosses']
manifest=read(Path('scripts/value/approved-verdict-changes.json'));buys={v['id']:v for v in audit['buyChanges']}
assert manifest==[] and buys=={}
assert all(v['byteIdentical'] for v in read(e/'preserved-record-bytes.json'))
assert read(e/'logo-coverage-proof.json')['passed']
for v in manifest:
 assert v['before']==buys[v['id']]['before']and v['after']==buys[v['id']]['after']
assert not read(e/'unexpected-analysis-failures.json')
for row in read(e/'retained-cache-failures.json'):
 for f in row['retained']:assert hashlib.sha256((r/'corpus'/f['file']).read_bytes()).hexdigest()==f['sha256']
 for rel in row['absent']:assert not(r/'corpus'/rel).exists()
assert read(e/'secret-scan.json')['findingCount']==0
space=[json.loads(line)['free']for line in(e/'disk.jsonl').read_text().splitlines()];minimum={p:min(v[p]for v in space)for p in space[0]};assert min(minimum.values())>=4*1024**3
transports=[json.loads(v)for v in(e/'git-transports.jsonl').read_text().splitlines()];assert all(Path(v['remote']).resolve()==(r/'storage/remote.git').resolve()for v in transports)
proof={'passed':True,'method':'3.5.0','baselineCode':read(e/'merged-master.json')['masterCommit'],'baselineArchive':read(e/'archive-baseline.json')['commit'],'dossiers':audit['candidateDossiers'],'unitSuite':'PASS','build':'PASS including TypeScript','ordinaryExport':'PASS','realPublishHarness':'PASS, local bare remote and stub Blob only','localPostPublish':'PASS','browser':'zero new findings; legacy findings listed separately','blobFiles':n,'blobBytes':size,'blobVersion':pointer['version'],'realLocalCommit':git(repo,'rev-parse','HEAD'),'candidateCoreFilesMatchRealPublish':core,'sourceBindings':inputs['sourceFiles'],'liveArchiveFiles':inputs['archiveFiles'],'minimumFreeBytes':minimum,'isolation':read(e/'isolation.json'),'externalTransport':False,'ownerBuyApproval':'Controller rejected all proposals; zero Buy changes','buyChanges':[v['id']for v in manifest]}
(e/'verification.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof,indent=2))
