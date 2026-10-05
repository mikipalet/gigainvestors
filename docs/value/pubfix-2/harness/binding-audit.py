import os,json,hashlib
from pathlib import Path
root=Path(os.environ['PUBFIX_ROOT']);r=root/'corpus';release=json.loads((r/'held-membership/release.json').read_text());freezes=json.loads((r/'verdict-freeze.json').read_text())['ids']
base={k:v for p in (root/'baseline/dossiers').glob('*.json') for k,v in json.loads(p.read_text()).items()}
rows=[]
for group in json.loads(Path('lib/value/issuer-registry.json').read_text())['groups']:
 aliases=[i for i in group['ids'] if i!=group['canonical'] and i in release['additionIds']]
 if not aliases:continue
 i=group['canonical'];a=json.loads((r/f'analysis/{i}.json').read_text());d=base[i]
 unchanged=hashlib.sha256((r/f'analysis/{i}.json').read_bytes()).hexdigest()==release['baselineAnalysisHashes'].get(i)
 mismatches=[k for k in ['asOf','versions','reportingCurrency'] if a.get(k)!=d.get(k)]
 if a.get('ownerMemo',{}).get('inputHash')!=d.get('ownerMemo',{}).get('inputHash'):mismatches.append('ownerMemo.inputHash')
 rows.append({'id':i,'aliases':aliases,'unchangedBaseline':unchanged,'explicitFreeze':i in freezes,'rawVsReleasedBindingDifferences':mismatches,'rawAsOf':a['asOf'],'releasedAsOf':d['asOf']})
(root/'evidence/canonical-binding-inputs.json').write_text(json.dumps(rows,indent=2)+'\n')
print('Canonical targets:',len(rows),'with private/released differences:',sum(bool(r['rawVsReleasedBindingDifferences']) for r in rows))
