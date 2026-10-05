"""Audit candidate economics, decision limits, coverage, and research-1 parity."""
from pathlib import Path
import gzip,json,hashlib,math
P=Path(__file__).resolve().parent;O=P/'outputs'
read=lambda p:json.load(gzip.open(p,'rt') if str(p).endswith('.gz') else open(p))
def close(x,y):return math.isclose(x,y,rel_tol=1e-12,abs_tol=1e-12)
freeze=read(O/'engine-freeze.json');assert freeze['candidate_sha256']==hashlib.sha256((P/'candidate.ts').read_bytes()).hexdigest()
rows=read(O/'replay.json.gz');paired=[r for r in rows if r['status']=='paired'];changed=[r for r in paired if r['changed']]
assert not any(r.get('error') for r in rows)
for r in changed:
 assert r['baseline'][1][1:]==r['candidate'][1][1:]
 assert r['candidate'][1][0]=='P' or r['baseline'][1][0]=='P' # confirmation may shift basis
 for key in ['moat','economics','management','accounting']:
  assert r['before'][key]==r['after'][key],(r['id'],r['quarter'],key)
ports=read(O/'portfolios.json');get=lambda s,p,v:next(r for r in ports if (r['scope'],r['period'],r['variant'])==(s,p,v))
prior=Path.home()/'data/value-research/outputs'
old_train=read(prior/'selection.json')['train'][0]
old_test=next(r for r in read(prior/'test-results.json')['results'] if r['scope']=='US' and r['variant']=='baseline' and r['weight']=='equal' and not r['pit_only'])
parity={}
for period,old in [('train',old_train),('later',old_test)]:
 now=get('US',period,'stored');parity[period]={k:close(now[k],old[k]) for k in ['cagr','max_drawdown']};assert all(parity[period].values())
for g in read(O/'decision-metrics.json')['gates']:
 b,c=get(g['scope'],g['period'],'baseline'),get(g['scope'],g['period'],'redesigned')
 assert g['passes']==(c['cagr']>=b['cagr']-.0025 and c['max_drawdown']>=b['max_drawdown']-.02)
receipt={'paired':len(paired),'changed':len(changed),'research1_US_parity':parity,'candidate_hash':freeze['candidate_sha256'],'no_other_quality_tests_changed':True}
(O/'verification.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2))
