"""Supplementary baseline price diagnostics; computed after freeze, never selects parameters."""
from pathlib import Path
import json,gzip,csv,collections,statistics,calendar
O=Path(__file__).parent/'outputs';R=Path.home()/'data/value-research'
def read(p):return json.load(gzip.open(p,'rt') if str(p).endswith('.gz') else open(p))
co={r['id']:r for r in read(R/'inputs/history/companies.json')}
for p in (R/'inputs/index').glob('*.json'):
 for r in read(p):co.setdefault(r['id'],r)
western={'US','TO','V','NEO','LSE','XETRA','F','PA','AS','BR','MC','MI','LS','VI','IR','CO','ST','HE','OL','WAR','SW','AU','NZ'}
labels=read(O/'return-labels.json.gz');ret={(i,q):r for i,q,r in labels['returns']};cuts={(s,q):(m,t) for s,q,m,t in labels['cutoffs']}
buckets=collections.defaultdict(lambda:[0,0,0,0])
for p in (O/'candidate').glob('*.json.gz'):
 for d in read(p):
  if d['status']!='paired':continue
  i,q=d['id'],d['quarter'];r=ret.get((i,q))
  if r is None:continue
  period='train' if int(q[:4])+3<=2015 else 'later' if q>='2016Q1' else None
  if not period:continue
  b=d['baseline'];pm=b[2];discount=b[5].get('discount') if len(b)>5 and isinstance(b[5],dict) else None
  us=co.get(i,{}).get('c')=='US';scopes=['US'] if us else ['all_nonUS']+(['Western_nonUS'] if i.rsplit('.',1)[-1] in western else [])
  for s in scopes:
   if (s,q) not in cuts:continue
   median,top=cuts[s,q]
   tests={'all_five_plus_buy':bool(b[3]),'MOS_price_comparison':None if pm is None or discount is None else pm<=1-discount+1e-12}
   for test,passed in tests.items():
    state='U' if passed is None else 'P' if passed else 'F';x=buckets[s,period,test,state,q];x[0]+=1;x[1]+=r>median;x[2]+=r>=top;x[3]+=r<0
rows=[];groups=collections.defaultdict(list)
for (s,p,t,state,q),n in buckets.items():groups[s,p,t,state].append(n)
for (s,p,t,state),ns in sorted(groups.items()):rows.append({'scope':s,'period':p,'test':t,'state':state,'n':sum(x[0] for x in ns),'hit':statistics.mean(x[1]/x[0] for x in ns),'top_decile':sum(x[2] for x in ns),'losers':sum(x[3] for x in ns)})
with (O/'baseline-price-predictiveness.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
print('Baseline price/buy diagnostic groups:',len(rows))
