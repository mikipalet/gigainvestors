"""Baseline-only audit. Outcomes never select or tune candidate parameters."""
from pathlib import Path
import collections,csv,gzip,json,os,types,statistics,math
HERE=Path(__file__).resolve().parent; O=HERE/'outputs'; R=HERE.parents[1]
read=lambda p:json.load(gzip.open(p,'rt') if str(p).endswith('.gz') else open(p))
os.environ['VALUE_RESEARCH_ROOT']=str(Path.home()/'data/value-research')
a=types.ModuleType('research1');a.__file__=str(HERE.parent/'understandable/research1-analyze.py')
s=Path(a.__file__).read_text().replace("funds=read(ROOT/'inputs/fundamentals-annual.json.gz')",'funds={}').replace("if (OUT/'replay.json.gz').exists():",'if False:')
exec(compile(s,a.__file__,'exec'),a.__dict__);a.OUT=O
scopes={'US':a.us,'Western_nonUS':lambda i:a.western(i) and not a.us(i),'all_nonUS':lambda i:not a.us(i)}
def csvout(name,rows):
 if rows:
  with (O/name).open('w') as f:
   w=csv.DictWriter(f,fieldnames=list(dict.fromkeys(k for r in rows for k in r)));w.writeheader();w.writerows(rows)
rows=[{k:v for k,v in r.items() if k not in ['numeric','integrity']} for p in sorted((O/'baseline').glob('*.json.gz')) for r in read(p)];coverage=collections.Counter(r['status'] for r in rows);(O/'coverage.json').write_text(json.dumps(coverage,indent=2))
labels=[];buckets=collections.defaultdict(list);iconic=collections.defaultdict(list);losers=[]
icons={'GOOGL.US','GOOG.US','NVDA.US','MSFT.US','AAPL.US','META.US','V.US','MA.US','COST.US','ASML.AS','ASML.US','MC.PA','LVMH.PA','RMS.PA','BRK-B.US','KO.US'}
for r in rows:
 if r['status']!='paired':continue
 i,q,b=r['id'],r['quarter'],r['baseline'];v=r['valuation'];year=int(q[:4]);period='train' if q<='2015Q3' else 'later' if q>='2016Q1' else None
 if not period:continue
 if i in icons:iconic[i,period].append(r)
 for horizon in [3,5]:
  if a.qend(q,horizon*4)>('2015-12-31' if period=='train' else '2026-09-30'):continue
  ret=a.returns(i,q,horizon*4);labels.append([i,q,horizon,ret])
  if ret is None:continue
  for scope,include in scopes.items():
   if include(i):buckets[scope,period,horizon,q].append((r,ret))
  if b[3] and ret<0:losers.append({'id':i,'quarter':q,'period':period,'horizon':horizon,'return':ret,'quality':b[1],'price_value':b[2],'expected':b[7].get('expected') if len(b)>7 else None,'kind':a.companies.get(i,{}).get('kind')})
summary=collections.defaultdict(list);correlations=[]
def corr(x,y):
 if len(x)<3 or len(set(x))<2 or len(set(y))<2:return None
 def rank(z):
  order=sorted(set(z));m={v:(sum(t<v for t in z)+(sum(t==v for t in z)-1)/2) for v in order};return [m[v] for v in z]
 return float(a.np.corrcoef(rank(x),rank(y))[0,1])
for (scope,period,h,q),rs in buckets.items():
 med=statistics.median(ret for _,ret in rs)
 for key in ['price_value','expected_return']:
  valid=[(r['baseline'][2] if key=='price_value' else r['baseline'][7].get('expected'),ret)for r,ret in rs if len(r['baseline'])>7]
  valid=[(x,y)for x,y in valid if x is not None and math.isfinite(x)]
  c=corr([x for x,_ in valid],[y for _,y in valid]);correlations.append({'scope':scope,'period':period,'contaminated':scope=='US' and period=='later','horizon':h,'quarter':q,'metric':key,'n':len(valid),'spearman':c})
  ranked=sorted(valid);n=len(ranked)
  for j,(x,ret) in enumerate(ranked):
   bucket=min(4,j*5//n)+1;summary[scope,period,h,key,'quintile_'+str(bucket)].append((q,ret,int(ret>med)))
 for r,ret in rs:
  b=r['baseline'];v=r['valuation'];exp=b[7].get('expected') if len(b)>7 else None
  for gate,passed in {'MOS':None if b[2] is None else b[2]<=1-b[5]['discount'],'expected_hurdle':None if exp is None or not v else exp>=v['discountRate'],'buy':b[3],'economics':b[1][2]=='P'}.items():summary[scope,period,h,gate,'unknown'if passed is None else 'pass'if passed else 'fail'].append((q,ret,int(ret>med)))
stat=[]
for (s,p,h,m,state),rs in sorted(summary.items()):
 byq=collections.defaultdict(list)
 for q,r,hit in rs:byq[q].append((r,hit))
 stat.append({'scope':s,'period':p,'contaminated':s=='US'and p=='later','horizon':h,'metric':m,'state':state,'n':len(rs),'quarters':len(byq),'mean_return':statistics.mean(r for _,r,_ in rs),'median_return':statistics.median(r for _,r,_ in rs),'quarter_equal_hit':statistics.mean(statistics.mean(hit for _,hit in vals)for vals in byq.values()),'negative_fraction':statistics.mean(r<0 for _,r,_ in rs)})
csvout('baseline-predictiveness.csv',stat);csvout('quarter-correlations.csv',correlations);csvout('losing-buys.csv',losers)
cs=[]
for s in scopes:
 for p in ['train','later']:
  for h in [3,5]:
   for m in ['price_value','expected_return']:
    rs=[r for r in correlations if (r['scope'],r['period'],r['horizon'],r['metric'])==(s,p,h,m)and r['spearman']is not None]
    cs.append({'scope':s,'period':p,'horizon':h,'metric':m,'quarters':len(rs),'mean_spearman':statistics.mean(r['spearman'] for r in rs)if rs else None})
csvout('correlation-summary.csv',cs)
ics=[]
for (i,p),rs in sorted(iconic.items()):
 known=[r for r in rs if r['baseline'][2] is not None];price=[r for r in known if r['baseline'][2]<=1-r['baseline'][5]['discount']];buy=[r for r in rs if r['baseline'][3]]
 ics.append({'id':i,'period':p,'rows':len(rs),'quality_pass':sum(r['baseline'][1]=='PPPPP'for r in rs),'valued':len(known),'price_pass':len(price),'buy':len(buy),'buy_quarters':' '.join(r['quarter']for r in buy),'minimum_price_value':min((r['baseline'][2]for r in known),default=None),'median_price_value':statistics.median(r['baseline'][2]for r in known)if known else None})
csvout('iconic-buy-frequency.csv',ics)
with gzip.open(O/'return-labels.json.gz','wt')as f:json.dump(labels,f)
print(json.dumps({'coverage':coverage,'predictive_groups':len(stat),'iconic_groups':len(ics),'losing_buy_records':len(losers)}),flush=True)
