"""Offline descriptive audit. No candidate rule or threshold search."""
from pathlib import Path
import bisect,collections,csv,datetime,gzip,json,math,statistics,shutil
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'research/rules/outputs';R=Path.home()/'data/value-research'
def read(p):
 with gzip.open(p,'rt') if str(p).endswith('.gz') else open(p) as f:return json.load(f)
def csvout(name,rows):
 if not rows:return
 with open(OUT/name,'w') as f:
  w=csv.DictWriter(f,fieldnames=list(dict.fromkeys(k for r in rows for k in r)));w.writeheader();w.writerows(rows)
def qend(q,offset=0):
 n=int(q[:4])*4+int(q[-1])-1+offset;y=n//4;m=(n%4+1)*3
 import calendar
 return f'{y:04}-{m:02}-{calendar.monthrange(y,m)[1]}'
co={r['id']:r for r in read(R/'inputs/history/companies.json')};frames={p.stem:read(p) for p in sorted((R/'inputs/history').glob('*Q*.json')) if p.stem<='2026Q2'}
qs=list(frames);returns={};decade={}
def guard():
 if any(shutil.disk_usage(p).free<4*1024**3 for p in ['/',Path.home()/'data']):raise RuntimeError('DISK STOP')
guard()
for p in (R/'prices').glob('*.json.gz'):
 guard();j=read(p);rows=j['rows'];dates=[r[0] for r in rows];i=p.name[:-8]
 def quote(d,after=False):
  n=bisect.bisect_right(dates,d) if after else bisect.bisect_right(dates,d)-1
  if n<0 or n>=len(rows) or abs((datetime.date.fromisoformat(dates[n])-datetime.date.fromisoformat(d)).days)>7:return None
  return rows[n][2]
 for q in qs:
  end=qend(q,12)
  if end>'2026-09-30':continue
  a,b=quote(qend(q),True),quote(end)
  if a and b:returns[i,q]=b/a-1
 a,b=quote('2016-09-30',True),quote('2026-09-30')
 if a and b:decade[i]=b/a-1
WESTERN={'US','TO','V','NEO','LSE','XETRA','F','PA','AS','BR','MC','MI','LS','VI','IR','CO','ST','HE','OL','WAR','SW','AU','NZ'}
scopes={'US':lambda i:co.get(i,{}).get('c')=='US','Western_nonUS':lambda i:co.get(i,{}).get('c')!='US' and i.rsplit('.',1)[-1] in WESTERN,'all_nonUS':lambda i:co.get(i,{}).get('c')!='US','all_markets':lambda i:True}
def quantile(xs,p):
 xs=sorted(xs);index=(len(xs)-1)*p;lo=int(index);hi=math.ceil(index);return xs[lo]+(xs[hi]-xs[lo])*(index-lo)
cut={}
for scope,include in scopes.items():
 for q,rows in frames.items():
  vs=[returns[r[0],q] for r in rows if include(r[0]) and (r[0],q) in returns]
  if vs:cut[scope,q]=(statistics.median(vs),quantile(vs,.9))
counts=collections.defaultdict(lambda:[0,0,0,0]);case=[];coverage=collections.Counter();kinds={}
for p in sorted((OUT/'audit').glob('*.json.gz')):
 for r in read(p):
  coverage[r['status']]+=1
  if r['status']!='paired':continue
  i,q=r['id'],r['quarter'];kind=co.get(i,{}).get('k','unknown');kinds[i]=kind
  if (i,q) not in returns:continue
  period='train' if qend(q,12)<='2015-12-31' else 'later' if q>='2016Q1' else 'embargo'
  if period=='embargo':continue
  v=returns[i,q]
  for test,t in r['numeric'].items():
   checks=[{'data':'ALL '+test,'pass':True if t['numeric']=='pass' else False if t['numeric']=='fail' else None}]+t.get('checks',[])
   for c in checks:
    state='P' if c['pass'] is True else 'F' if c['pass'] is False else 'U'
    rule=test+': '+c['data'];
    for scope,include in scopes.items():
     if not include(i) or (scope,q) not in cut:continue
     med,top=cut[scope,q];key=(scope,period,kind,rule,q,state);a=counts[key];a[0]+=1;a[1]+=int(v>med);a[2]+=int(v>=top);a[3]+=int(v<0)
   if v<0 and r['baseline'][1]=='PPPPP':case.append({'id':i,'quarter':q,'period':period,'kind':kind,'return_3y':v,'quality':'PPPPP','buy':r['baseline'][3]}) if test=='understandable' else None
summary=[]
groups=collections.defaultdict(list)
for (s,p,k,r,q,state),vals in counts.items():
 for kind in [k,'all']:
  groups[s,p,kind,r,state].append(vals)
for (s,p,k,r,state),vs in groups.items():
 summary.append({'scope':s,'period':p,'kind':k,'rule':r,'state':state,'n':sum(v[0] for v in vs),'quarter_hit':statistics.mean(v[1]/v[0] for v in vs),'winner_n':sum(v[2] for v in vs),'loser_n':sum(v[3] for v in vs)})
# For all-kind hit rates pool kinds WITHIN a quarter, then equally weight quarters.
pooled=collections.defaultdict(lambda:[0,0,0,0])
for (s,p,k,r,q,state),vs in counts.items():
 for n,v in enumerate(vs):pooled[s,p,r,q,state][n]+=v
rates=collections.defaultdict(list)
for (s,p,t,q,state),v in pooled.items():rates[s,p,t,state].append(v[1]/v[0])
for r in summary:
 if r['kind']=='all':r['quarter_hit']=statistics.mean(rates[r['scope'],r['period'],r['rule'],r['state']])
csvout('audit-subtest-predictiveness.csv',summary)
rank=[]
for scope in scopes:
 for period in ['train','later']:
  rules={r['rule'] for r in summary if (r['scope'],r['period'],r['kind'])==(scope,period,'all')}
  for rule in rules:
   rows={r['state']:r for r in summary if (r['scope'],r['period'],r['kind'],r['rule'])==(scope,period,'all',rule)};f,p=rows.get('F',{}),rows.get('P',{})
   rank.append({'scope':scope,'period':period,'rule':rule,'winner_failures':f.get('winner_n',0),'loser_passes':p.get('loser_n',0),'failed':f.get('n',0),'passed':p.get('n',0),'pass_hit':p.get('quarter_hit'),'fail_hit':f.get('quarter_hit')})
csvout('audit-ranked-rules.csv',sorted(rank,key=lambda r:(r['scope'],r['period'],-r['winner_failures'])))
csvout('audit-losing-quality-passers.csv',case)
current=[]
for p in (OUT/'current').glob('*.json.gz'):
 r=read(p);i=r['id'];c=r['company'];tests=r['tests'];m=tests['moat']['metrics'];returnsNow=[v for _,v in tests['moat']['series'].get('roic',tests['moat']['series'].get('roe',[])) if v is not None]
 current.append({'id':i,'name':c['name'],'country':c['country'],'kind':c['kind'],'return_10y':decade.get(i),'quality':''.join(tests[k]['numeric'][0].upper() for k in ['understandable','moat','economics','management','accounting']),'median_return':m.get('roicMedian',m.get('roeMedian')),'latest_return':returnsNow[-1] if returnsNow else None,'current_economics':tests['economics']['numeric'],'reasons':' | '.join(k+': '+', '.join(t['reasons']) for k,t in tests.items() if t['numeric']=='fail')})
for r in current:
 vs=[x['return_10y'] for x in current if x['return_10y'] is not None and (x['country']=='US')==(r['country']=='US')]
 r['top_decile_10y']=r['return_10y'] is not None and r['return_10y']>=quantile(vs,.9)
 r['excellent_current']=r['current_economics']=='pass' and (r['median_return'] or 0)>=.15 and (r['latest_return'] or 0)>=.15
csvout('audit-current-10y.csv',sorted(current,key=lambda r:-(r['return_10y'] or -1)))
(OUT/'audit-coverage.json').write_text(json.dumps(dict(coverage),indent=2)+'\n')
(OUT/'return-labels.json.gz').write_bytes(gzip.compress(json.dumps({'returns':[[i,q,v] for (i,q),v in returns.items()],'cutoffs':[[s,q,*v] for (s,q),v in cut.items()]}).encode()))
print('Audit complete',dict(coverage),'current',len(current),flush=True)
