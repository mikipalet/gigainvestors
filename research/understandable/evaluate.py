"""Single frozen candidate; reuse research-1's total-return measurement offline."""
from pathlib import Path
import collections,copy,csv,gzip,hashlib,importlib.util,json,os,sys
import numpy as np
HERE=Path(__file__).resolve().parent
receipt=HERE/'outputs/evaluation-opened.json'
seal={k:hashlib.sha256((HERE/k).read_bytes()).hexdigest() for k in ['candidate.ts','protocol.json']}
if receipt.exists():
 previous=json.loads(receipt.read_text())
 if previous['seal']!=seal:raise RuntimeError('Frozen candidate/protocol changed after returns opened')
else:
 import datetime
 receipt.write_text(json.dumps({'opened_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'seal':seal},indent=2)+'\n')
os.environ['VALUE_RESEARCH_ROOT']=str(Path.home()/'data/value-research')
spec=importlib.util.spec_from_file_location('research1',HERE/'research1-analyze.py');a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
a.OUT=HERE/'outputs';a.guard()
# Equal-weight evaluation does not use capitalization or the prior diagnostic replay.
a.funds={};a.replay={}
import gc;gc.collect()
exec((HERE/'research1-portfolio.py').read_text(),a.__dict__)
orig_us,orig_western=a.us,a.western
stored=a.frames
replay=a.read(HERE/'outputs/replay.json.gz');by={(r['quarter'],r['id']):r for r in replay}
frames={v:{q:[] for q in stored} for v in ['baseline','redesigned','stored','stored_anchored']}
coverage=[];changes=[]
for q,rs in stored.items():
 for r in rs:
  p=by.get((q,r[0]),{});ok=p.get('status')=='paired'
  frames['stored'][q].append(r)
  frames['baseline'][q].append(p['baseline'] if ok else r)
  frames['redesigned'][q].append(p['candidate'] if ok else r)
  # Anchor the change to the authoritative historical row only where all original
  # quality and buy decisions match; keep unrelated replay drift out of this check.
  anchored=ok and p['qualityMatch'] and p['buyMatch']
  frames['stored_anchored'][q].append(p['candidate'] if anchored and p.get('changed') else r)
  coverage.append({'quarter':q,'id':r[0],'country':a.co.get(r[0],{}).get('c'),'paired':ok,'status':p.get('status','no replay'),'quality_match':p.get('qualityMatch'),'buy_match':p.get('buyMatch')})
  if p.get('changed'):
   if p['baseline'][1][1:]!=p['candidate'][1][1:]:raise RuntimeError('Non-understandable gate changed')
   changes.append({'quarter':q,'id':r[0],'before':p['baseline'][1],'after':p['candidate'][1],'buy_before':p['baseline'][3],'buy_after':p['candidate'][3],'stored_match':anchored,'cv_before':p['before']['understandable']['metrics'].get('opMarginCv'),'cv_after':p['after']['understandable']['metrics'].get('opMarginCv'),'reason':' | '.join(p['after']['understandable']['reasons'])})
a.csvout('replay-coverage.csv',coverage);a.csvout('historical-changes.csv',changes)
scopes={'US':orig_us,'Western_nonUS':lambda i:orig_western(i) and not orig_us(i),'all_markets':lambda i:True,'all_nonUS':lambda i:not orig_us(i)}
periods={'train':[q for q in stored if '2005Q1'<=q<='2015Q3'],'later':[q for q in stored if '2016Q1'<=q<='2026Q2']}
results=[]
for scope,include in scopes.items():
 for period,qs in periods.items():
  for variant in frames:
   a.frames={q:[r for r in rows if include(r[0])] for q,rows in frames[variant].items()}
   a.us=lambda i:scope=='US';a.western=lambda i:True
   r,path=a.portfolio_local(qs,'baseline',scope='US' if scope=='US' else 'nonUS')
   r.update(scope=scope,period=period,variant=variant,contaminated=scope=='US' and period=='later')
   results.append(r);a.write(f'path-{scope}-{period}-{variant}.json.gz',path)
   print(scope,period,variant,round(r['cagr']*100,4),round(r['max_drawdown']*100,4),'missing',r['missing_allocations'],flush=True)
a.us,a.western=orig_us,orig_western
a.write('portfolios.json',results)
# Three-year security associations use identical universe medians/top-decile ranks
# for both variants, including local returns for international as research-1 did.
quarter_metrics=[];new_passes=[]
for scope,include in scopes.items():
 for q,rs in stored.items():
  if a.qend(q,12)>a.END:continue
  period='train' if a.qend(q,12)<='2015-12-31' else 'later' if q>='2016Q1' else 'embargo'
  if period=='embargo':continue
  rs=[r for r in rs if include(r[0])];vals={r[0]:a.returns(r[0],q,12) for r in rs};valid=[v for v in vals.values() if v is not None]
  if not valid:continue
  median=float(np.median(valid));top=float(np.quantile(valid,.9))
  group={v:{r[0]:r for r in frames[v][q]} for v in ['baseline','redesigned']}
  for variant in group:
   for state in ['P','F','U']:
    selected=[r for r in rs if group[variant][r[0]][1][0]==state];vs=[vals[r[0]] for r in selected if vals[r[0]] is not None]
    quarter_metrics.append({'scope':scope,'period':period,'quarter':q,'variant':variant,'state':state,'selected':len(selected),'observed':len(vs),'hit':a.mean([v>median for v in vs]),'top_decile':sum(v>=top for v in vs),'losers':sum(v<0 for v in vs),'median':median})
  for r in rs:
   i=r[0];b,c=group['baseline'][i],group['redesigned'][i];v=vals[i]
   if b[1][0]!='P' and c[1][0]=='P':
    new_passes.append({'scope':scope,'period':period,'quarter':q,'id':i,'return_3y':v,'top_decile':v>=top if v is not None else None,'loser':v<0 if v is not None else None,'below_median':v<median if v is not None else None,'all_quality_now':c[1]=='PPPPP','buy_now':bool(c[3])})
a.csvout('quality-by-quarter.csv',quarter_metrics);a.csvout('new-pass-outcomes.csv',new_passes)
summary=[]
for scope in scopes:
 for period in periods:
  for variant in ['baseline','redesigned']:
   for state in ['P','F','U']:
    rows=[r for r in quarter_metrics if (r['scope'],r['period'],r['variant'],r['state'])==(scope,period,variant,state)]
    summary.append({'scope':scope,'period':period,'variant':variant,'state':state,'hit':a.mean([r['hit'] for r in rows if r['hit'] is not None]),'observations':sum(r['observed'] for r in rows),'selected':sum(r['selected'] for r in rows),'quarters':sum(r['observed']>0 for r in rows),'top_decile':sum(r['top_decile'] for r in rows),'losers':sum(r['losers'] for r in rows)})
a.csvout('quality-summary.csv',summary)
new_summary=[]
for scope in scopes:
 for period in periods:
  rows=[r for r in new_passes if (r['scope'],r['period'])==(scope,period)]
  new_summary.append({'scope':scope,'period':period,'new_pass_records':len(rows),'unique_companies':len({r['id'] for r in rows}),'observed':sum(r['return_3y'] is not None for r in rows),'top_decile':sum(r['top_decile'] is True for r in rows),'losers':sum(r['loser'] is True for r in rows),'below_median':sum(r['below_median'] is True for r in rows),'new_all_quality':sum(r['all_quality_now'] for r in rows),'new_buys':sum(r['buy_now'] for r in rows)})
a.csvout('new-pass-summary.csv',new_summary)
gates=[]
for scope in scopes:
 for period in periods:
  b=next(r for r in results if (r['scope'],r['period'],r['variant'])==(scope,period,'baseline'))
  c=next(r for r in results if (r['scope'],r['period'],r['variant'])==(scope,period,'redesigned'))
  gates.append({'scope':scope,'period':period,'required':not(scope=='US' and period=='later'),'cagr_change_pp':100*(c['cagr']-b['cagr']),'drawdown_change_pp':100*(c['max_drawdown']-b['max_drawdown']),'passes':c['cagr']>=b['cagr']-.0025 and c['max_drawdown']>=b['max_drawdown']-.02,'baseline_missing':b['missing_allocations'],'candidate_missing':c['missing_allocations']})
a.write('decision-metrics.json',{'performance_gate_passes':all(g['passes'] for g in gates if g['required']),'gates':gates,'new_passes':new_summary,'candidate_sha256':hashlib.sha256((HERE/'candidate.ts').read_bytes()).hexdigest()})
print(json.dumps(gates,indent=2))
