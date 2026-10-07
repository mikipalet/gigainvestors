"""Record completed checks and blockers honestly before deleting isolated fixtures."""
import hashlib,json,subprocess
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-5');e=r/'evidence';repo=r/'corpus/publish-repo'
read=lambda p:json.loads(p.read_text())
git=lambda p,*args:subprocess.check_output(['/usr/bin/git','-C',str(p),*args],text=True).strip()
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
exits={name:(e/(name+'.exit')).read_text().strip()for name in ['unit-final-isolated','build-candidate','publish-out-final','publish-real','post-check','release-audit','presentation-final']}
assert exits['unit-final-isolated']==exits['build-candidate']==exits['presentation-final']=='0'
browser=read(e/'browser-comparison.json');assert browser['pass']and browser['qualitySurfaceAudits']==30 and browser['priceSurfaceAudits']==10
assert read(e/'price-gate-proof.json')['pass'];assert read(e/'bundle-integrity.json')['passed']
inputs=read(e/'input-integrity.json');archive=read(e/'archive-baseline.json');live=Path('/Users/miki/value-corpus/publish-repo')
changed=[rel for rel,h in archive['files'].items()if not(live/rel).is_file()or digest(live/rel)!=h]
live_head=git(live,'rev-parse','HEAD')
tracked=set(git(live,'ls-tree','-r','--name-only','HEAD').splitlines())
(e/'live-archive-final.json').write_text(json.dumps({'commit':live_head,'matchesBoundCommit':live_head==archive['commit'],'changed':changed,'newTrackedFiles':sorted(tracked-set(archive['files'])),'missingTrackedFiles':sorted(set(archive['files'])-tracked)},indent=2)+'\n')
audit=read(e/'release-audit.json');assert audit['baselineDossiers']==len(read(e/'released-ids.json'))
assert not audit['frozenRecordChanges']and not audit['buyChanges']and not audit['approvedBuyChanges']
assert read(Path('scripts/value/approved-verdict-changes.json'))==[]
assert all(v['dossierIdentical']and v['indexIdentical']for v in read(e/'preserved-records.json'))
assert not read(e/'unexpected-analysis-failures.json')
for row in read(e/'retained-cache-failures.json'):
 for f in row['retained']:assert digest(r/'corpus'/f['file'])==f['sha256']
 for rel in row['absent']:assert not(r/'corpus'/rel).exists()
assert read(e/'secret-scan.json')['findingCount']==0
space=[json.loads(line)['free']for line in(e/'disk.jsonl').read_text().splitlines()];minimum={p:min(v[p]for v in space)for p in space[0]};assert min(minimum.values())>=4*1024**3
transports=[json.loads(v)for v in(e/'git-transports.jsonl').read_text().splitlines()];assert all(Path(v['remote']).resolve()==(r/'storage/remote.git').resolve()for v in transports)
iso=read(e/'isolation.json');assert iso['interfaces']==['lo']and iso['sourceCorpusReadOnly']and iso['externalRoutes']==0
rules=['lib/value/owner-earnings.ts','lib/value/valuation.ts','lib/value/config.ts','lib/value/tests','lib/value/return-model.ts','lib/value/owner-return.ts','lib/value/buy-price.ts','lib/value/financial-valuation.ts','lib/value/investment-nav.ts','lib/value/method-version.ts','scripts/value/approved-verdict-changes.json','scripts/value/stages/publish.ts']
subprocess.run(['git','diff','--exit-code','800a816','--',*rules],check=True,stdout=subprocess.DEVNULL)
changedProduction=git(Path.cwd(),'diff','--name-only','800a816','--','lib','components','scripts').splitlines()
assert set(changedProduction)=={'components/value/DossierNumbers.tsx','components/value/EvidencePanel.tsx','lib/value/method-content.ts','lib/value/surface-audit.ts','lib/value/tile-metric.ts'}
research=Path('research/valuation');sealed=0
for seal in ['phase-1-freeze.json','protocol-freeze.json','implementation-freeze.json','evaluation-code-freeze.json']:
 obj=read(research/seal)
 if seal=='protocol-freeze.json':
  assert digest(research/'protocol.json')==obj['protocolSha256'];assert digest(research/'phase-1-report.md')==obj['auditSha256']
 for rel,want in {**obj.get('files',{}),**obj.get('sources',{})}.items():
  p=research/rel
  if not p.exists():p=Path(rel)
  assert p.exists()and digest(p)==want,(seal,rel);sealed+=1
failures={name:(e/(name+'.log')).read_text().splitlines()[-1]for name in ['publish-out-final','publish-real']if exits[name]!='0'}
# Publication failure is a release blocker, never converted into a pass.
assert failures and audit['missing'],'This closure records the observed NOT outcome; successful publication needs the full success verifier.'
remote=git(r/'storage/remote.git','rev-parse','main');blobfiles=list((r/'storage/blob').rglob('*'))if(r/'storage/blob').exists()else[]
assert remote==archive['commit'],'A failed publisher unexpectedly changed the local remote'
assert not any(p.is_file()for p in blobfiles),'A failed publisher unexpectedly uploaded a Blob'
proof={'complete':True,'passed':False,'releaseReady':False,'status':'NOT','method':'3.5.0','baselineCode':'800a81697a704e8a25f197bed751f9f32facfa1d','baselineArchive':archive['commit'],'dossiers':audit['candidateDossiers'],'unitSuite':'2490 passed, 1 skipped','build':'PASS including TypeScript','ordinaryExport':'FAIL: '+failures.get('publish-out-final','unknown'),'realPublishHarness':'FAIL: '+failures.get('publish-real','unknown'),'localPostPublish':'BLOCKED by failed REAL publication','browser':'zero new findings against original 800a816 UI; raw legacy findings retained','gateExits':exits,'missingCanonicalDossiers':audit['missing'],'sourceDriftCount':len(inputs['sourceMismatches']),'sourceDriftBlocksInstallation':bool(inputs['sourceMismatches']),'liveArchiveChanges':changed,'liveArchiveCommitMatches':live_head==archive['commit'],'localRemoteUnchanged':True,'blobFilesUploaded':0,'sourceBindings':inputs['sourceFiles'],'liveArchiveFiles':inputs['archiveFiles'],'minimumFreeBytes':minimum,'isolation':iso,'externalTransport':False,'economicRulesChanged':False,'sealedFilesVerified':sealed,'ownerBuyApproval':'Zero approved; five proposed transitions held at complete live records','buyChanges':[]}
(e/'verification.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof,indent=2))
