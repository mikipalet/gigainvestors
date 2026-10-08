"""Buy list before (bound live archive) and after (candidate), with every verdict change."""
import json
from pathlib import Path
repo=Path('/Users/miki/data/value-rules');r=repo/'.audit/rules-7';e=r/'evidence'
def rows(store):
 out={}
 for f in sorted((store/'index').glob('[A-Z][A-Z].json')):
  for row in json.loads(f.read_text()):out[row['id']]=row
 return out
before,after=rows(r/'baseline'),rows(r/'candidate-final')
buy=lambda rs:sorted(i for i,x in rs.items() if x.get('b'))
proposals=[p['id'] for p in json.loads((repo/'docs/value/rules-6/evidence/proposed-buy-approvals.json').read_text())]
freeze=json.loads((r/'corpus/verdict-freeze.json').read_text())['ids']
changes=[{'id':i,'name':after.get(i,before.get(i,{})).get('n'),'before':before[i].get('b'),'after':after[i].get('b'),'tBefore':before[i].get('t'),'tAfter':after[i].get('t'),'vBefore':before[i].get('v'),'vAfter':after[i].get('v')} for i in sorted(set(before)&set(after)) if bool(before[i].get('b'))!=bool(after[i].get('b'))]
out={'buyBefore':buy(before),'buyAfter':buy(after),'newBuys':sorted(set(buy(after))-set(buy(before))),'removedBuys':sorted(set(buy(before))-set(buy(after))),
 'changes':changes,'proposals':{i:{'before':bool(before.get(i,{}).get('b')),'after':bool(after.get(i,{}).get('b')),'present':i in after} for i in proposals},
 'frozenStillPublishedAsLive':{i:before.get(i)==after.get(i) for i in freeze if i in before},
 'companiesBefore':len(before),'companiesAfter':len(after)}
(e/'buy-summary.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({k:v for k,v in out.items() if k not in ['changes','frozenStillPublishedAsLive']},indent=1))
print('frozen rows identical to live:',sum(out['frozenStillPublishedAsLive'].values()),'/',len(out['frozenStillPublishedAsLive']))
