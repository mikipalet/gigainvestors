"""Fail closed on the complete release, including unchanged production guards."""
import hashlib,json,subprocess
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-6');e=r/'evidence';repo=r/'corpus/publish-repo'
read=lambda p:json.loads(p.read_text())
git=lambda p,*args:subprocess.check_output(['/usr/bin/git','-C',str(p),*args],text=True).strip()
for name in ['unit-final-isolated','build-candidate','publish-out-final','publish-real','post-check','final-types','build-baseline','end-bindings']:
 assert (e/(name+'.exit')).read_text().strip()=='0',name
for name in ['browser-comparison','price-gate-proof','bundle-integrity','logo-coverage-proof']:
 row=read(e/(name+'.json'));assert row.get('pass',row.get('passed')),name
assert read(e/'browser-comparison.json')['qualitySurfaceAudits']==30
assert read(e/'browser-comparison.json')['priceSurfaceAudits']==10
assert read(e/'visual-review.json')['personallyReviewed']
archive=read(e/'live-archive-final.json');assert not archive['changed']and archive['matchesBoundCommit']
assert not(repo/'.git/value-publish-pending.json').exists();assert not git(repo,'status','--porcelain')
assert git(repo,'rev-parse','HEAD')==git(r/'storage/remote.git','rev-parse','main')
check=read(e/'live-check.json');assert check['passed']and not check['pageErrors']
pointer=read(r/'storage/blob/value/current.json');blob=r/'storage/blob/value/versions'/pointer['version'];h=hashlib.sha256();size=0;n=0
for p in sorted(p for p in blob.rglob('*')if p.is_file()):
 rel=p.relative_to(blob).as_posix();data=(repo/rel).read_bytes();assert data==p.read_bytes(),rel
 h.update((rel+'\0'+hashlib.sha256(data).hexdigest()+'\n').encode());size+=len(data);n+=1
assert h.hexdigest()==pointer['version']
core=0
for directory in ['index','dossiers','search']:
 for p in(r/'candidate-final'/directory).glob('*.json'):
  a,b=read(p),read(repo/directory/p.name)
  if directory=='dossiers':
   for records in [a,b]:
    for d in records.values():
     if d.get('priceStory'):d['priceStory'].pop('asOf',None)
  assert a==b,str(p);core+=1
inputs=read(e/'input-integrity.json');assert not inputs['sourceMismatches']and not inputs['archiveMismatches']and not inputs['sourceAdditions']and inputs['bindingOutsideNightlyWindow']
audit=read(e/'release-audit.json');assert audit['baselineDossiers']==audit['candidateDossiers']==len(read(e/'released-ids.json'))
assert not audit['missing']and not audit['added']and not audit['frozenRecordChanges']and not audit['valuationLosses']
assert read(Path('scripts/value/approved-verdict-changes.json'))==[] and audit['buyChanges']==[]
assert all(v['byteIdentical'] for v in read(e/'preserved-record-bytes.json'))
assert read(e/'blocker-resolution.json')['passed']
assert not read(e/'unexpected-analysis-failures.json')
for row in read(e/'retained-cache-failures.json'):
 for f in row['retained']:assert hashlib.sha256((r/'corpus'/f['file']).read_bytes()).hexdigest()==f['sha256']
 for rel in row['absent']:assert not(r/'corpus'/rel).exists()
assert all(v['identical']for v in read(e/'replay-shipping-binding.json'))
assert read(e/'secret-scan.json')['findingCount']==0
space=[json.loads(line)['free']for line in(e/'disk.jsonl').read_text().splitlines()];minimum={p:min(v[p]for v in space)for p in space[0]};assert min(minimum.values())>=4*1024**3
transports=[json.loads(v)for v in(e/'git-transports.jsonl').read_text().splitlines()];assert all(Path(v['remote']).resolve()==(r/'storage/remote.git').resolve()for v in transports)
# Every production coverage/invariant/price guard remains the initial source.
guards=['scripts/value/publication-coverage.ts','scripts/value/publish-invariants.ts','lib/value/publication-capitalization.ts','lib/value/config.ts']
for p in guards:assert not git(Path('.'),'diff','8ed2c83','--',p),p
proof={'passed':True,'method':'3.6.0','baselineCode':'8ed2c83','baselineArchive':read(e/'archive-baseline.json')['commit'],'dossiers':audit['candidateDossiers'],'unitSuite':'PASS','build':'PASS including TypeScript','ordinaryExport':'PASS','realPublishHarness':'PASS, local bare remote and stub Blob only','localPostPublish':'PASS','browser':'zero new findings; legacy findings retained','blobFiles':n,'blobBytes':size,'blobVersion':pointer['version'],'realLocalCommit':git(repo,'rev-parse','HEAD'),'candidateCoreFilesMatchRealPublish':core,'sourceBindings':inputs['sourceFiles'],'liveArchiveFiles':inputs['archiveFiles'],'minimumFreeBytes':minimum,'isolation':read(e/'isolation.json'),'externalTransport':False,'approvedBuyChanges':0,'proposedBuyChanges':len(read(e/'proposed-buy-approvals.json')),'ownerOverride':'Accounting correctness ships regardless of historical performance gates','productionGuardsUnchanged':guards}
(e/'verification.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof,indent=2))
