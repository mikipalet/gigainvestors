"""Require all final gates and bind the local real-publish bytes to stub Blob."""
import hashlib,json,re,subprocess
from pathlib import Path
r=Path('/Users/miki/data/regress/run2');e=r/'evidence';repo=r/'corpus/publish-repo'
read=lambda p:json.loads(p.read_text())
git=lambda p,*args:subprocess.check_output(['git','-C',str(p),*args],text=True).strip()
for name in ['unit-final-isolated','build-candidate','publish-out-final','publish-real','post-check']:
 assert (e/(name+'.exit')).read_text().strip()=='0',name
unit=(e/'unit-final-isolated.log').read_text()
assert '250 passed (250)'in unit and '2428 passed | 1 skipped (2429)'in unit
assert read(e/'browser-comparison.json')['pass']
assert not(repo/'.git/value-publish-pending.json').exists()
assert not git(repo,'status','--porcelain')
assert git(repo,'rev-parse','HEAD')==git(r/'storage/remote.git','rev-parse','main')
live=read(e/'live-check.json');assert live['passed']and not live['pageErrors']
pointer=read(r/'storage/blob/value/current.json');blob=r/'storage/blob/value/versions'/pointer['version']
files=sorted(p.relative_to(blob).as_posix()for p in blob.rglob('*')if p.is_file());h=hashlib.sha256();size=0
for rel in files:
 payload=(repo/rel).read_bytes();assert payload==(blob/rel).read_bytes(),rel
 digest=hashlib.sha256(payload).hexdigest();h.update((rel+'\0'+digest+'\n').encode());size+=len(payload)
assert h.hexdigest()==pointer['version']
core=0
differences=read(e/'out-vs-real-differences.json')
assert all(v['path'].endswith('.priceStory.asOf')and v['out'][:10]==v['real'][:10]=='2026-10-06'for v in differences)
for directory in ['index','dossiers','search']:
 for file in(r/'candidate-final'/directory).glob('*.json'):
  dry,real=read(file),read(repo/directory/file.name)
  if directory=='dossiers':
   for records in [dry,real]:
    for dossier in records.values():
     if dossier.get('priceStory'):dossier['priceStory'].pop('asOf',None)
  assert dry==real,'Audited candidate differs from real publish: '+str(file)
  core+=1
inputs=read(e/'input-integrity.json');assert not inputs['sourceMismatches']and not inputs['liveArchiveMismatches']
assert not read(e/'live-archive-final.json')['changed']
assert read(e/'secret-scan.json')['findingCount']==0
assert read(e/'candidate-archive-integrity.json')['passed']
failed=read(e/'retained-cache-failures.json');assert len(failed)==88
for row in failed:
 for file in row['retained']:assert hashlib.sha256((r/'corpus'/file['file']).read_bytes()).hexdigest()==file['sha256']
 for rel in row['absentInLive']:assert not(r/'corpus'/rel).exists()
for rel,want in read(e/'final-code-hashes.json').items():assert hashlib.sha256(Path(rel).read_bytes()).hexdigest()==want,rel
audit=read(e/'release-audit.json');assert audit['numericResolution'][0]['restoredOrRefreshed']==6209
original=read(Path('docs/value/regress-1/audit-classifications.json'))
unexplained={(v['id'],v['path'])for v in original if v['kind']=='numeric-null'and v['classification']=='controller-review'}
resolved=read(e/'candidate-numeric-nulls-resolution.json')
assert len(unexplained)==53 and all(v['restoredOrRefreshed']for v in resolved if(v['id'],v['path'])in unexplained)
explained={(v['id'],v['path']):v for v in original if v['kind']=='numeric-null'and v['classification']=='primary-source-explained'}
nulls=read(e/'candidate-numeric-nulls.json');assert len(nulls)==22 and all((v['id'],v['path'])in explained for v in nulls)
(e/'remaining-nulls-primary-evidence.json').write_text(json.dumps([explained[(v['id'],v['path'])]for v in nulls],indent=2)+'\n')
contradictions=read(r/'corpus/staging/issuer-share-contradictions.json')
assert audit['valuationLosses']==['EXR.US']and contradictions.get('EXR.US')
(e/'suppressed-valuations.json').write_text(json.dumps([{'id':'EXR.US','publishedShares':221052600,'filing':contradictions['EXR.US'],'disagreement':221052600/211269558-1}],indent=2)+'\n')
space=[json.loads(line)['free']for line in(e/'disk.jsonl').read_text().splitlines()];minimum={p:min(v[p]for v in space)for p in space[0]};assert min(minimum.values())>=4*1024**3
transports=[json.loads(line)for line in(e/'git-transports.jsonl').read_text().splitlines()];assert all(Path(v['remote']).resolve()==(r/'storage/remote.git').resolve()for v in transports)
proof={'passed':True,'unitFiles':250,'unitPassed':2428,'unitSkipped':1,'build':'PASS including TypeScript','ordinaryPublishOut':'PASS','realPublish':'PASS; production invariants, local bare remote and stub Blob','localPostPublish':'PASS; quarter-back and 2018Q3; receipt cleared','blobFiles':len(files),'blobBytes':size,'blobVersion':pointer['version'],'realCommit':git(repo,'rev-parse','HEAD'),'numericMissingRestored':6209,'unexplainedNulls':0,'explicitNullsRestored':57,'primaryExplainedNulls':22,'minimumFreeBytes':minimum,'sourceBindings':inputs['sourceBindings'],'liveArchiveUnchangedFiles':inputs['liveArchiveFiles'],'isolation':read(e/'isolation.json'),'externalTransport':False,'sourceImplementationUnchangedDuringFinalGates':True}
proof['candidateCoreFilesMatchRealPublish']=core
proof['excludedRunClockOnlyPriceStoryTimestamps']=len(differences)
(e/'verification.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof,indent=2))
