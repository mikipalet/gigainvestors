import json,hashlib,collections
from pathlib import Path
r=Path.home()/'data/regress';c=r/'corpus';e=r/'evidence'
def read(p):return json.loads(p.read_text())
def dossiers(p):return {i:d for f in(p/'dossiers').glob('*.json')for i,d in read(f).items()}
a=dossiers(r/'baseline');b=dossiers(r/'candidate-final');ids=read(c/'verdict-freeze.json')['ids']
approved=read(Path('scripts/value/approved-verdict-changes.json'));s=read(e/'candidate-summary.json')
state=lambda row:{k:row[k]for k in ['b','v','m']}
exact={p['id']:any(x['id']==p['id']and state(x['before'])==p['before']and state(x['after'])==p['after']and x['before']['t']==x['after']['t']for x in s['buyChanges'])for p in approved}
original='BRO.US COP.US EG.US GRMN.US HST.US MCD.US MRK.XETRA VIVT3.SA WRB.US'.split()
scale={i:{'rawValuationRestored':read(c/f'analysis/{i}.json').get('valuation')is not None,'publicValuationPresent':b[i].get('valuation')is not None,'historyYears':b[i].get('historyCoverage',{}).get('years')}for i in original}
alias=read(r/'candidate-final/aliases.json')
result={'frozen':len(ids),'frozenDossiersChanged':[i for i in ids if a[i]!=b.get(i)],'missingDossiers':sorted(set(a)-set(b)),'added':sorted(set(b)-set(a)),'invalidAliases':{i:t for i,t in alias.items()if i==t or t in alias or t not in b or i in b},'exactApprovals':exact,'originalScaleRegressions':scale,'pipeline':'29','approvalManifestSha256':hashlib.sha256(Path('scripts/value/approved-verdict-changes.json').read_bytes()).hexdigest()}
(e/'final-integrity.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
