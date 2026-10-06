"""Require the valuation outputs reviewed in rules-2, with no new differences."""
import json
from pathlib import Path

root=Path('/Users/miki/data/value-rules/.audit/rules-3')
reference=json.loads(Path('docs/value/rules-3/rules-2-valuation-baseline.json').read_text())
assert reference['codeCommit']=='63a3d4fa5df829f759a9821a213fa8d26212053b'
proofs=[]
for arm in ['candidate-final','corpus/publish-repo']:
    rows={v['id']:{k:v.get(k) for k in ['v','m']}
          for file in (root/arm/'index').glob('??.json')
          for v in json.loads(file.read_text())}
    differences=[id for id in sorted(set(rows)|set(reference['rows']))
                 if rows.get(id)!=reference['rows'].get(id)]
    proofs.append({'arm':arm,'rowsCompared':len(rows),'differences':differences})
result={'passed':all(not p['differences'] for p in proofs),
        'historicalCodeCommit':reference['codeCommit'],
        'historicalCandidateSha256':reference['candidateSha256'],
        'explanation':'Live-to-candidate valuation effects were already in reviewed rules-2; no new rules-3 valuation tuple or margin difference is permitted.',
        'proofs':proofs}
(root/'evidence/valuation-rules2-comparison.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
assert result['passed'], 'New valuation or required-margin difference from reviewed rules-2'
