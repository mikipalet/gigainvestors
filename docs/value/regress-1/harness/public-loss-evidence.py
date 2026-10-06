"""Trace public value removals through raw valuation and private publish guards."""
import json,collections
from pathlib import Path
root=Path.home()/'data/regress';e=root/'evidence';c=root/'corpus'
def read(p):
 try:return json.loads(p.read_text())
 except FileNotFoundError:return None
losses=read(e/'candidate-valuation-nulls.json')
checks={r['id']:r for r in read(c/'staging/unresolved-shares.json')['companies']}
balances={r['id']:r for r in read(e/'balance-trace.json')}
capital={r['id']:r for r in read(c/'staging/publication-capitalization.json')}
result=[]
for r in losses:
 id=r['id'];a=read(c/f'analysis/{id}.json');v=a.get('valuation')
 result.append({'id':id,'cause':'publication-share-check'if v else 'analysis-valuation-unavailable','rawReason':a.get('valuationReason'),'publishShareCheck':checks.get(id),'capitalization':capital.get(id),'latestBalanceEvidence':balances.get(id),'rawValuation':v,'priorPublicValuation':r['before'],'classification':'controller-review','disposition':'A guard explains removal but does not prove that the underlying source data is correct. No approval inferred.'})
(e/'public-valuation-loss-evidence.json').write_text(json.dumps(result,indent=2)+'\n')
print(dict(collections.Counter(r['cause']for r in result)))
