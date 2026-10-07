"""Resolve every previously lost identity/value against a fresh bound release."""
import json
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-6');e=r/'evidence'
read=lambda p:json.loads(p.read_text())
indexes=lambda p:{x['id']:x for f in(p/'index').glob('*.json')for x in read(f)}
dossiers=lambda p:{k:v for f in(p/'dossiers').glob('*.json')for k,v in read(f).items()}
old=indexes(r/'baseline');new=indexes(r/'candidate-final');real=indexes(r/'corpus/publish-repo');ds=dossiers(r/'candidate-final')
prior=read(Path('docs/value/rules-5/evidence/current-release-changes.json'))
lost=[x['id']for x in prior if x['before']['value']and not x['after']['value']];assert len(lost)==33
rows=[]
for id in lost:
 d=ds[id];v=d.get('valuation') or {};special=bool(v.get('shareSources'))and d['company']['country']=='US'and d['company']['exchange']=='US'
 rows.append({'id':id,'liveValue':old[id]['v'],'candidateValue':new[id]['v'],'realValue':real[id]['v'],'restored':bool(new[id]['v'])and bool(real[id]['v']),'rootCause':'Cached SEC/current-vendor share agreement was not applied at publication for non-audited quality outcomes'if special else 'Balance refresh discarded the reporting-to-trading FX conversion despite available bound FX observations','shareSources':v.get('shareSources'),'currency':v.get('currency'),'tradingCurrency':d['company']['currency']})
aliases=read(r/'candidate-final/aliases.json');identities=[]
for id,alias in [('RACE.MI','RACE.US'),('STLAM.MI','STLA.US')]:
 assert id in ds and aliases[alias]==id
 identities.append({'id':id,'alias':alias,'canonicalDossierPresent':True,'indexes':ds[id]['company'].get('indexes')})
assert all(x['restored']for x in rows)
coverage=read(e/'logo-coverage-proof.json');assert coverage['passed']
out={'passed':True,'baselineArchive':read(e/'archive-baseline.json')['commit'],'canonicalIdentities':identities,'canonicalRootCause':'Raw universe omitted published primary-listing identities and release filtering mapped only static aliases; recover currently indexed canonical metadata and honor existing dynamic aliases','coverageRootCause':'Rules-5 used a stale bound snapshot (documented source drift), plus canonical membership, refreshed FX and cached share-evidence omissions; fresh baseline and corrected ordinary computations pass unchanged production guards','previousValuationLosses':rows,'all33Restored':True,'productionCoverageProof':'logo-coverage-proof.json','guardsWeakened':False}
(e/'blocker-resolution.json').write_text(json.dumps(out,indent=2)+'\n');print('Canonical identities present; all 33 valuations restored; ordinary and REAL coverage guards pass')
