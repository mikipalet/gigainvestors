"""Apply the owner's predeclared ship rule; no fitted thresholds."""
from pathlib import Path
import collections,csv,gzip,hashlib,json,os,types,datetime,statistics
HERE=Path(__file__).resolve().parent;OUT=HERE/'outputs'
read=lambda p:json.load(gzip.open(p,'rt')if str(p).endswith('.gz')else open(p))
seal=read(HERE/'implementation-freeze.json');assert all(hashlib.sha256(Path(n).read_bytes()).hexdigest()==v for n,v in seal['sources'].items())
assert len(list((OUT/'candidate').glob('*.json.gz')))==2058
opened=OUT/'evaluation-opened.json';assert not opened.exists();opened.write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceSeal':hashlib.sha256((HERE/'implementation-freeze.json').read_bytes()).hexdigest()},indent=2)+'\n')
os.environ['VALUE_RESEARCH_ROOT']=str(Path.home()/'data/value-research')
a=types.ModuleType('research1');a.__file__=str(HERE.parent/'understandable/research1-analyze.py')
s=Path(a.__file__).read_text().replace("funds=read(ROOT/'inputs/fundamentals-annual.json.gz')",'funds={}').replace("if (OUT/'replay.json.gz').exists():",'if False:')
exec(compile(s,a.__file__,'exec'),a.__dict__);exec((HERE.parent/'understandable/research1-portfolio.py').read_text(),a.__dict__);a.OUT=OUT;a.guard()
orig_us,orig_western=a.us,a.western;stored=a.frames;variants=['baseline','sbc_once','current_scale','combined'];frames={v:{q:{r[0]:r for r in rs}for q,rs in stored.items()}for v in variants};coverage=collections.Counter();changes=[]
for p in sorted((OUT/'candidate').glob('*.json.gz')):
 for r in read(p):
  coverage[r['status']]+=1
  if r['status']!='paired':continue
  q,i=r['quarter'],r['id'];frames['baseline'][q][i]=r['baseline']
  for v,x in r['variants'].items():
   frames[v][q][i]=x['row']
   if x['changed']:changes.append({'id':i,'quarter':q,'variant':v,'before':r['baseline'][1],'after':x['row'][1],'buy_before':r['baseline'][3],'buy_after':x['row'][3],'price_value_before':r['baseline'][2],'price_value_after':x['row'][2]})
a.csvout('historical-changes.csv',changes)
scopes={'US':orig_us,'Western_nonUS':lambda i:orig_western(i)and not orig_us(i),'all_nonUS':lambda i:not orig_us(i)}
periods={'train':[q for q in stored if '2005Q1'<=q<='2015Q3'],'later':[q for q in stored if '2016Q1'<=q<='2026Q2']}
results=[]
for scope,include in scopes.items():
 for period,qs in periods.items():
  for variant in variants:
   a.guard();a.frames={q:[r for r in rs.values()if include(r[0])]for q,rs in frames[variant].items()};a.us=lambda i:scope=='US';a.western=lambda i:True
   r,path=a.portfolio_local(qs,'baseline',scope='US'if scope=='US'else'nonUS');r.update(scope=scope,period=period,variant=variant,contaminated=scope=='US'and period=='later');results.append(r)
   a.write(f'path-{scope}-{period}-{variant}.json.gz',path);print(scope,period,variant,round(r['cagr']*100,4),round(r['max_drawdown']*100,4),'missing',r['missing_allocations'],flush=True)
a.write('portfolios.json',results);a.us,a.western=orig_us,orig_western
labels={(i,q,h):ret for i,q,h,ret in read(OUT/'return-labels.json.gz')};cuts={}
for scope,include in scopes.items():
 for q in stored:
  vals=[ret for (i,quarter,h),ret in labels.items()if quarter==q and h==3 and ret is not None and include(i)]
  if vals:cuts[scope,q]=(statistics.median(vals),float(a.np.quantile(vals,.9)))
new=[];new_summary=[];gates=[]
for scope,include in scopes.items():
 for period,qs in periods.items():
  for variant in variants[1:]:
   rs=[]
   for q in qs:
    for i,c in frames[variant][q].items():
     if not include(i):continue
     b=frames['baseline'][q][i]
     if b[3]or not c[3]:continue
     ret=labels.get((i,q,3));med,top=cuts.get((scope,q),(None,None));x={'scope':scope,'period':period,'variant':variant,'id':i,'quarter':q,'return_3y':ret,'loser':ret<0 if ret is not None else None,'below_median':ret<med if ret is not None and med is not None else None,'top_decile':ret>=top if ret is not None and top is not None else None};rs.append(x);new.append(x)
   known=[r for r in rs if r['return_3y']is not None];bycompany=collections.defaultdict(list)
   for x in known:bycompany[x['id']].append(x['return_3y'])
   n={'scope':scope,'period':period,'variant':variant,'new_buys':len(rs),'companies':len({r['id']for r in rs}),'observed':len(known),'missing':len(rs)-len(known),'losers':sum(r['loser']is True for r in rs),'below_median':sum(r['below_median']is True for r in rs),'top_decile':sum(r['top_decile']is True for r in rs),'companies_observed':len(bycompany),'companies_mean_negative':sum(statistics.mean(v)<0 for v in bycompany.values())};new_summary.append(n)
   b=next(r for r in results if(r['scope'],r['period'],r['variant'])==(scope,period,'baseline'));c=next(r for r in results if(r['scope'],r['period'],r['variant'])==(scope,period,variant))
   perf=c['cagr']>=b['cagr']-.0025-1e-12 and c['max_drawdown']>=b['max_drawdown']-.02-1e-12;loser=n['losers']<=n['observed']/2
   gates.append({'scope':scope,'period':period,'variant':variant,'required':not(scope=='US'and period=='later'),'cagr_change_pp':100*(c['cagr']-b['cagr']),'drawdown_change_pp':100*(c['max_drawdown']-b['max_drawdown']),'performance_pass':perf,'not_loser_dominated':loser,'passes':perf and loser,'missing_baseline':b['missing_allocations'],'missing_candidate':c['missing_allocations']})
accepted={v:all(g['passes']for g in gates if g['variant']==v and g['required'])for v in variants[1:]};accepted['combined']=accepted['combined']and accepted['sbc_once']and accepted['current_scale']
a.csvout('new-buy-outcomes.csv',new);a.csvout('new-buy-summary.csv',new_summary);a.write('decision-metrics.json',{'accepted':accepted,'gates':gates,'new_buys':new_summary,'coverage':dict(coverage)});print(json.dumps({'accepted':accepted,'failures':[g for g in gates if g['required']and not g['passes']]},indent=2),flush=True)
