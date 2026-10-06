"""Apply the owner's frozen ship rule to every candidate; never retune it."""
from pathlib import Path
import collections,copy,csv,datetime,gzip,hashlib,json,os,types
HERE=Path(__file__).resolve().parent;OUT=HERE/'outputs';ROOT=HERE.parents[1]
read=lambda p:json.load(gzip.open(p,'rt') if str(p).endswith('.gz') else open(p))
seal=read(HERE/'implementation-freeze.json')['sources']
assert all(hashlib.sha256((HERE/n).read_bytes()).hexdigest()==v for n,v in seal.items()),'Frozen implementation changed'
assert len(list((OUT/'candidate').glob('*.json.gz')))==2058,'Incomplete candidate replay'
opened=OUT/'evaluation-opened.json'
if not opened.exists():opened.write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'seal':seal},indent=2)+'\n')
else:assert read(opened)['seal']==seal
os.environ['VALUE_RESEARCH_ROOT']=str(Path.home()/'data/value-research')
a=types.ModuleType('research1');a.__file__=str(HERE.parent/'understandable/research1-analyze.py')
source=Path(a.__file__).read_text().replace("funds=read(ROOT/'inputs/fundamentals-annual.json.gz')",'funds={}').replace("if (OUT/'replay.json.gz').exists():",'if False:')
exec(compile(source,a.__file__,'exec'),a.__dict__)
exec((HERE.parent/'understandable/research1-portfolio.py').read_text(),a.__dict__);a.OUT=OUT;a.guard()
orig_us,orig_western=a.us,a.western
stored=a.frames;variants=['baseline','recovered_dip','recent_typical_margin','combined'];frames={v:{q:{r[0]:r for r in rs} for q,rs in stored.items()} for v in variants};coverage=collections.Counter();changes=[]
for p in sorted((OUT/'candidate').glob('*.json.gz')):
 a.guard()
 for r in read(p):
  coverage[r['status']]+=1
  if r['status']!='paired':continue
  q,i=r['quarter'],r['id'];frames['baseline'][q][i]=r['baseline']
  for v,x in r['variants'].items():
   frames[v][q][i]=x['row']
   if x['changed']:
    changes.append({'id':i,'quarter':q,'variant':v,'before':r['baseline'][1],'after':x['row'][1],'buy_before':r['baseline'][3],'buy_after':x['row'][3],'price_value_before':r['baseline'][2],'price_value_after':x['row'][2],'reason':' | '.join(k+': '+', '.join(t['reasons']) for k,t in x['numeric'].items() if k in ['understandable','moat'])})
assert not coverage['error'],coverage
a.csvout('historical-changes.csv',changes);a.write('candidate-coverage.json',dict(coverage))
scopes={'US':orig_us,'Western_nonUS':lambda i:orig_western(i) and not orig_us(i),'all_nonUS':lambda i:not orig_us(i),'all_markets':lambda i:True}
periods={'train':[q for q in stored if '2005Q1'<=q<='2015Q3'],'later':[q for q in stored if '2016Q1'<=q<='2026Q2']}
results=[]
for scope,include in scopes.items():
 for period,qs in periods.items():
  for variant in variants:
   a.guard();a.frames={q:[r for r in rows.values() if include(r[0])] for q,rows in frames[variant].items()}
   a.us=lambda i:scope=='US';a.western=lambda i:True
   r,path=a.portfolio_local(qs,'baseline',scope='US' if scope=='US' else 'nonUS');r.update(scope=scope,period=period,variant=variant,contaminated=scope=='US' and period=='later');results.append(r)
   a.write(f'path-{scope}-{period}-{variant}.json.gz',path)
   print(scope,period,variant,round(r['cagr']*100,4),round(r['max_drawdown']*100,4),'missing',r['missing_allocations'],flush=True)
a.write('portfolios.json',results);a.us,a.western=orig_us,orig_western
labels=read(OUT/'return-labels.json.gz');returns={(i,q):v for i,q,v in labels['returns']};cut={(s,q):(m,t) for s,q,m,t in labels['cutoffs']}
counts=collections.defaultdict(lambda:[0,0,0,0]);new=[];keys=['understandable','moat','economics','management','accounting','all_quality']
for scope,include in scopes.items():
 for q,rs in stored.items():
  if (scope,q) not in cut:continue
  period='train' if a.qend(q,12)<='2015-12-31' else 'later' if q>='2016Q1' else 'embargo'
  if period=='embargo':continue
  med,top=cut[scope,q]
  for original in rs:
   i=original[0]
   if not include(i):continue
   ret=returns.get((i,q));b=frames['baseline'][q][i]
   for variant in variants:
    c=frames[variant][q][i]
    for j,key in enumerate(keys):
     state=c[1][j] if j<5 else 'P' if c[1]=='PPPPP' else 'F' if 'F' in c[1] else 'U'
     if ret is not None:
      bucket=counts[scope,period,variant,key,state,q];bucket[0]+=1;bucket[1]+=int(ret>med);bucket[2]+=int(ret>=top);bucket[3]+=int(ret<0)
    j=0 if variant=='recovered_dip' else 1
    changed=(b[1][j]!='P' and c[1][j]=='P') if variant in ['recovered_dip','recent_typical_margin'] else any(b[1][k]!='P' and c[1][k]=='P' for k in range(2))
    if variant!='baseline' and changed:
     new.append({'scope':scope,'period':period,'variant':variant,'id':i,'quarter':q,'return_3y':ret,'top_decile':ret>=top if ret is not None else None,'loser':ret<0 if ret is not None else None,'below_median':ret<med if ret is not None else None,'all_quality_before':b[1]=='PPPPP','all_quality_after':c[1]=='PPPPP','buy_before':bool(b[3]),'buy_after':bool(c[3])})
a.csvout('new-pass-outcomes.csv',new)
summary=[];groups=collections.defaultdict(list)
for (s,p,v,k,state,q),n in counts.items():groups[s,p,v,k,state].append(n)
for (s,p,v,k,state),rs in groups.items():summary.append({'scope':s,'period':p,'variant':v,'test':k,'state':state,'n':sum(r[0] for r in rs),'hit':a.mean([r[1]/r[0] for r in rs]),'top_decile':sum(r[2] for r in rs),'losers':sum(r[3] for r in rs)})
a.csvout('quality-summary.csv',summary)
new_summary=[];gates=[]
for scope in scopes:
 for period in periods:
  b=next(r for r in results if (r['scope'],r['period'],r['variant'])==(scope,period,'baseline'))
  for variant in variants[1:]:
   c=next(r for r in results if (r['scope'],r['period'],r['variant'])==(scope,period,variant));rs=[r for r in new if (r['scope'],r['period'],r['variant'])==(scope,period,variant)]
   n={'scope':scope,'period':period,'variant':variant,'new_pass_records':len(rs),'companies':len({r['id'] for r in rs}),'observed':sum(r['return_3y'] is not None for r in rs),'top_decile':sum(r['top_decile'] is True for r in rs),'losers':sum(r['loser'] is True for r in rs),'below_median':sum(r['below_median'] is True for r in rs),'new_all_quality':sum(not r['all_quality_before'] and r['all_quality_after'] for r in rs),'new_buys':sum(not r['buy_before'] and r['buy_after'] for r in rs)};n.update({level+'_'+outcome:sum((not r[level+'_before'] and r[level+'_after']) and r[outcome] is True for r in rs) for level in ['all_quality','buy'] for outcome in ['top_decile','loser']});new_summary.append(n)
   performance=c['cagr']>=b['cagr']-.0025-1e-12 and c['max_drawdown']>=b['max_drawdown']-.02-1e-12;not_dominated=n['losers']<=n['observed']/2
   gates.append({'scope':scope,'period':period,'variant':variant,'required':scope!='all_markets' and not(scope=='US' and period=='later'),'cagr_change_pp':100*(c['cagr']-b['cagr']),'drawdown_change_pp':100*(c['max_drawdown']-b['max_drawdown']),'performance_passes':performance,'not_loser_dominated':not_dominated,'passes':performance and not_dominated,'baseline_missing':b['missing_allocations'],'candidate_missing':c['missing_allocations']})
accepted={v:all(g['passes'] for g in gates if g['variant']==v and g['required']) for v in variants[1:]};accepted['combined']=accepted['combined'] and accepted['recovered_dip'] and accepted['recent_typical_margin']
a.csvout('new-pass-summary.csv',new_summary);a.write('decision-metrics.json',{'accepted':accepted,'gates':gates,'new_passes':new_summary,'seal':seal});print(json.dumps({'accepted':accepted,'required_failures':[g for g in gates if g['required'] and not g['passes']]},indent=2),flush=True)
