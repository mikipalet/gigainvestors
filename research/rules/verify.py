from pathlib import Path
import csv,gzip,hashlib,json,math
HERE=Path(__file__).resolve().parent;OUT=HERE/'outputs'
read=lambda p:json.load(gzip.open(p,'rt') if str(p).endswith('.gz') else open(p))
seal=read(HERE/'implementation-freeze.json')['sources'];assert all(hashlib.sha256((HERE/n).read_bytes()).hexdigest()==h for n,h in seal.items())
for name in ['understandable','moat']:
 expected=(HERE/f'candidate-{name}.ts').read_text().replace('../../lib/value/','../')
 assert expected==(HERE.parents[1]/f'lib/value/tests/{name}.ts').read_text(),name+' production differs from frozen source'
base=[r for r in read(OUT/'portfolios.json') if r['variant']=='baseline'];previous=read(HERE.parent/'understandable/outputs/portfolios.json');parity=[]
for b in base:
 p=next(r for r in previous if r['variant']=='redesigned' and r['scope']==b['scope'] and r['period']==b['period'])
 metrics={k:math.isclose(b[k],p[k],abs_tol=1e-12,rel_tol=1e-12) for k in ['cagr','max_drawdown']}
 parity.append({'scope':b['scope'],'period':b['period'],'metrics':metrics});assert all(metrics.values()),parity[-1]
n=0
for p in (OUT/'candidate').glob('*.json.gz'):
 for r in read(p):
  assert r['status']!='error'
  if r['status']!='paired':continue
  n+=1
  for v,c in r['variants'].items():
   assert c['row'][1][2:]==r['baseline'][1][2:],(r['id'],r['quarter'],v)
   if v=='recovered_dip':assert c['row'][1][1:]==r['baseline'][1][1:]
   if v=='recent_typical_margin':assert c['row'][1][0]==r['baseline'][1][0]
   if c['row'][3]:assert c['row'][1]=='PPPPP' and c['row'][2] <= 1-c['row'][5]['discount']+1e-6
assert n==93961,'Extract outputs/replay-evidence.tar.gz before replay verification'
r={'paired':n,'baseline_parity_with_3_4_research':parity,'frozen_sources':seal,'other_three_quality_verdicts_unchanged':True,'every_replayed_buy_satisfies_price_gate':True}
(OUT/'verification.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
