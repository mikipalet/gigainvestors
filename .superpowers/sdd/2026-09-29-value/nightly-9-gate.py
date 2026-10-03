from pathlib import Path
import json,re,hashlib,gzip
r=Path('.fix5c/nightly-9');live=Path('/Users/miki/value-corpus/publish-repo');candidate=r/'after-final'
load=lambda p:json.loads(p.read_text())
audit=load(r/'audit.json');price=load(r/'price-audit.json');nulls=load(r/'semantic-store-nulls-summary.json');numeric=load(r/'semantic-numeric-losses.json');features=load(r/'live-features.json')
historyLoss=[]
for p in (live/'history').glob('*.json'):
 if not re.fullmatch(r'\d{4}(?:Q[1-4])?\.json',p.name):continue
 q=candidate/'history'/p.name;old=load(p);new=load(q) if q.exists() else []
 missing=sorted({x[0] for x in old}-{x[0] for x in new})
 if missing:historyLoss.append({'file':p.name,'missing':missing})
(r/'history-membership-losses.json').write_text(json.dumps(historyLoss,indent=2)+'\n')
checks={'zeroQualityFlips':not audit['verdictChanges'],'zeroUnapprovedPriceChanges':not price['unapprovedPriceChanges'],'zeroPriceVerdictsBlanked':not price['blankedPriceVerdicts'],'zeroNumericToNullOutsideFreeze':not [x for x in nulls['rows'] if not x['frozen']],'zeroRemovedNumericSeriesObservations':not numeric['removedSeriesObservations'],'zeroLostHistoricalMemberships':not historyLoss,'zeroLostPredecessors':not features['lostPredecessors'],'zeroFrozenByteMismatches':not audit['frozenByteMismatches'],'zeroFrozenAliasMismatches':not audit['frozenAliasMismatches'] and not features['canonicalFrozenAliasMismatches'],'zeroDossierIndexPriceInconsistencies':not price['indexDossierInconsistencies'],'sameDossierMembership':not audit['added'] and not audit['removed'],'publishRepoUnchanged':not audit['liveFilesChangedExternally'],'holdUnchanged':audit['holdUnchanged']}
result={'decision':'LIFT' if all(checks.values()) else 'NOT LIFT','checks':checks,'beforeDossiers':audit['beforeCount'],'afterDossiers':audit['afterCount'],'fullCompanyFreeze':audit['frozen'],'fullCompanyFrozenRecords':audit['frozenRecordsCompared'],'priceTestFreezeCount':price['priceTestFreezeCount'],'quoteOnlyPriceVerdictChanges':price['quoteOnlyChanges'],'numericToNull':nulls['occurrences'],'removedNumericSeriesObservations':len(numeric['removedSeriesObservations']),'lostHistoricalMemberships':sum(len(x['missing']) for x in historyLoss),'original114Resolutions':price['original114Resolutions']}
(r/'gate.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
assert all(checks.values()),'Release gates not satisfied'
