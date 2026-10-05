import os
"""Frozen-rule, offline performance investigation. Run train, then test once.
Price data: Yahoo split-adjusted close and dividend-adjusted close; USD conversion
for direct Western listings; unknown quotes remain cash, never dropped/reweighted.
"""
from pathlib import Path
import bisect,calendar,collections,csv,datetime,gzip,hashlib,json,math,shutil,sys
import numpy as np
ROOT=Path(os.environ.get('VALUE_RESEARCH_ROOT',str(Path.home()/'data/value-research')));OUT=ROOT/'outputs';END='2026-09-30'
TESTS=['understandable','moat','economics','management','accounting']
VARIANTS=['baseline','sector_weights','financial_15','fair_value']
WESTERN={'US','TO','V','NEO','LSE','XETRA','F','PA','AS','BR','MC','MI','LS','VI','IR','CO','ST','HE','OL','WAR','SW','AU','NZ'}
def guard():
 for p in ['/',str(Path.home()/'data')]:
  if shutil.disk_usage(p).free<4*1024**3:raise RuntimeError('DISK STOP: commit and stop')
def read(p):
 with gzip.open(p,'rt') if str(p).endswith('.gz') else open(p) as f:return json.load(f)
def write(name,j):
 guard();p=OUT/name
 text=json.dumps(j,indent=None if str(p).endswith('.gz') else 2,allow_nan=False)
 with gzip.open(p,'wt') if str(p).endswith('.gz') else open(p,'w') as f:f.write(text+'\n')
def csvout(name,rows):
 if not rows:return
 guard()
 with open(OUT/name,'w') as f:
  w=csv.DictWriter(f,fieldnames=list(dict.fromkeys(k for r in rows for k in r)));w.writeheader();w.writerows(rows)
def mean(xs):return float(np.mean(xs)) if len(xs) else None
def median(xs):return float(np.median(xs)) if len(xs) else None
def qend(q,offset=0):
 y=int(q[:4]);n=(int(q[-1])-1+offset);y+=n//4;m=n%4*3+3
 return f'{y:04}-{m:02}-{calendar.monthrange(y,m)[1]}'
def day(s):return datetime.date.fromisoformat(s).toordinal()
def stats(vals,bench=None):
 vals=[x for x in vals if x is not None and math.isfinite(x)]
 return {'n':len(vals),'mean':mean(vals),'median':median(vals),'hit':mean([v>bench for v in vals]) if bench is not None else None}
co={r['id']:r for r in read(ROOT/'inputs/history/companies.json')}
current={r['id']:r for p in (ROOT/'inputs/index').glob('*.json') for r in read(p)}
frames={p.stem:read(p) for p in sorted((ROOT/'inputs/history').glob('*Q*.json')) if p.stem<='2026Q2'}
companies=read(ROOT/'inputs/companies.json.gz')
funds=read(ROOT/'inputs/fundamentals-annual.json.gz')
prices={};price_meta={}
for p in sorted((ROOT/'prices').glob('*.json.gz')):
 try:j=read(p)
 except Exception:continue
 i=p.name[:-8];rs=j['rows'];prices[i]=(np.array([day(r[0]) for r in rs],dtype=np.int32),np.array([r[1] for r in rs]),np.array([r[2] for r in rs]));price_meta[i]={k:j.get(k) for k in ['symbol','currency','fetchedAt','sha256_response']}
member_dates=[];member_sets=[]
with open(ROOT/'inputs/sp500-history.csv') as f:
 for r in csv.DictReader(f):
  member_dates.append(r['date']);member_sets.append(set(t.replace('.','-') for t in r['tickers'].split(',')))
order=sorted(range(len(member_dates)),key=lambda i:member_dates[i]);member_dates=[member_dates[i] for i in order];member_sets=[member_sets[i] for i in order]
def members(q):return member_sets[bisect.bisect_right(member_dates,qend(q))-1]
def pit(i,q):return i.endswith('.US') and i[:-3].replace('.','-') in members(q)
def sector(i):return co.get(i,current.get(i,{})).get('s') or companies.get(i,{}).get('sector') or 'Unknown'
def financial(i):return co.get(i,current.get(i,{})).get('k') in ['bank','insurer']
def us(i):return co.get(i,current.get(i,{})).get('c')=='US'
def western(i):return i.rsplit('.',1)[-1] in WESTERN
FX={'GBp':'GBP','GBX':'GBP','ILA':'ILS','ZAc':'ZAR'}
def quote(i,d,kind=2,after=False,usd=False):
 if i not in prices:return None
 ds,cl,ad=prices[i];n=int(np.searchsorted(ds,d,side='right') if after else np.searchsorted(ds,d,side='right')-1)
 if n<0 or n>=len(ds) or abs(int(ds[n])-d)>7:return None
 v=float((cl if kind==1 else ad)[n])
 if usd:
  cur=price_meta[i]['currency'];cur=FX.get(cur,cur)
  if cur!='USD':
   fx=quote(cur+'USD=X',int(ds[n]),kind=1)
   if not fx:return None
   v*=fx[0]
 return v,int(ds[n])
def returns(i,q,nq=4,kind=2,usd=False):
 start=day(qend(q));stop=day(qend(q,nq))
 if stop>day(END):return None
 a=quote(i,start,kind,True,usd);b=quote(i,stop,kind,False,usd)
 return b[0]/a[0]-1 if a and b and b[1]>a[1] else None
def pick(r,v):
 if v=='fair_value':return r[1]=='PPPPP' and r[2] is not None and 0<r[2]<=1 and len(r)>7 and r[7] and r[7].get('expected') is not None and r[7]['expected']>=.1
 if not r[3]:return False
 if v=='financial_15' and financial(r[0]):
  x=(r[6] or {}).get('value') if len(r)>6 else None
  return isinstance(x,(float,int)) and x>=.15
 return True
# Annual disclosed shares; splits align to Yahoo's current share basis via cached splits.
# This is a capitalization proxy, not historical float weights.
def cap(i,r):
 annual=(r[7] or {}).get('annual') if len(r)>7 else None
 f=funds.get(i,{});ys=[y for y in f.get('years',[]) if y.get('fy')==annual]
 if not ys:return None
 y=ys[-1];sh=y.get('dilutedShares');p=(r[5] or {}).get('price') if len(r)>5 else None
 if not sh or not p:return None
 # Published history price and financial share series were reconciled by production.
 # Prefer replay's identically aligned valuation shares when available (loaded below).
 rp=replay.get((i,active_q),{}) if 'active_q' in globals() else {}
 return rp.get('capProxy') or sh*p
replay={}
if (OUT/'replay.json.gz').exists():replay={(r['id'],r['quarter']):r for r in read(OUT/'replay.json.gz') if not r.get('error')}
def weights(rows,v,weight='equal'):
 selected=[r for r in rows if pick(r,v)];n=len(selected)
 if not n:return {}
 if v=='sector_weights':
  univ=collections.Counter(sector(r[0]) for r in rows);sel=collections.Counter(sector(r[0]) for r in selected)
  return {r[0]:univ[sector(r[0])]/len(rows)/sel[sector(r[0])] for r in selected}
 if weight=='cap':
  cs={r[0]:cap(r[0],r) for r in selected};valid={i:c for i,c in cs.items() if c and c>0};s=sum(valid.values())
  return {i:c/s for i,c in valid.items()} if s else {}
 return {r[0]:1/n for r in selected}
def perf(nav,dates):
 if not nav:return {}
 ar=np.array(nav);peak=np.maximum.accumulate(np.r_[1,ar]);dd=np.r_[1,ar]/peak-1
 years=(dates[-1]-dates[0]+1)/365.25
 return {'total':float(ar[-1]-1),'cagr':float(ar[-1]**(1/years)-1),'max_drawdown':float(dd.min()),'start':datetime.date.fromordinal(dates[0]).isoformat(),'end':datetime.date.fromordinal(dates[-1]).isoformat()}
def portfolio(qs,v,scope='US',weight='equal',pit_only=False,kind=2):
 global active_q
 nav=[];dates=[];wealth=1.;turnover=0;missing=[];ncounts=[];cashweights=[];periods=[]
 for q in qs:
  active_q=q;rs=[r for r in frames[q] if (us(r[0]) if scope=='US' else western(r[0]) and not us(r[0])) and (not pit_only or pit(r[0],q))]
  ws=weights(rs,v,weight);ncounts.append(len(ws));cashweights.append(1-sum(ws.values()))
  start=day(qend(q));stop=day(qend(q,1));ds=prices['SPY'][0];ds=ds[(ds>start)&(ds<=stop)]
  if not len(ds):continue
  # Buy first available close after signal; liquidate quarter end; remain cash
  # over the one-day execution gap. Full liquidation costs both sides each quarter.
  paths=np.ones((len(ds),len(ws))) if ws else np.ones((len(ds),0));invested=0
  for n,(i,w) in enumerate(ws.items()):
   a=quote(i,int(ds[0]),kind,False,scope!='US');b=quote(i,int(ds[-1]),kind,False,scope!='US')
   if not a or a[1]<=start or not b:
    missing.append({'quarter':q,'id':i,'weight':w,'reason':'missing entry/exit or FX; allocation in cash'});continue
   paths[:,n]=[ (z[0]/a[0] if (z:=quote(i,int(d),kind,False,scope!='US')) else 1.) for d in ds]
   paths[:,n]*=(1-.001);paths[-1,n]*=(1-.001)
   invested+=w
  wv=np.array(list(ws.values()));growth=paths@wv+(1-sum(ws.values()))
  turnover+=2*invested
  values=wealth*growth;periods.append({'quarter':q,'return':float(growth[-1]-1),'n':len(ws),'cash':1-sum(ws.values()),'missing':sum(m['quarter']==q for m in missing)})
  nav.extend(map(float,values));dates.extend(map(int,ds));wealth=float(values[-1])
 result=perf(nav,dates)
 result.update({'variant':v,'scope':scope,'weight':weight,'pit_only':pit_only,'mean_positions':mean(ncounts),'mean_cash_weight':mean(cashweights),'turnover_sides':turnover,'missing_allocations':len(missing),'periods':periods})
 return result,{'dates':[datetime.date.fromordinal(d).isoformat() for d in dates],'nav':nav,'missing':missing}
def benchmark(qs,i='SPY'):
 start=day(qend(qs[0]));end=day(qend(qs[-1],1));a=quote(i,start,after=True)
 if not a:return {}
 ds,_,ps=prices[i];mask=(ds>=a[1])&(ds<=end);return perf((ps[mask]/a[0]).tolist(),ds[mask].tolist())
def run_train():
 qs=[q for q in frames if q<='2015Q3'];results=[]
 for v in VARIANTS:
  r,path=portfolio(qs,v);results.append(r);write('train-path-'+v+'.json.gz',path)
 base=results[0];eligible=[r for r in results[1:] if r['cagr']>base['cagr'] and r['max_drawdown']>=base['max_drawdown']]
 chosen=max(eligible,key=lambda r:r['cagr'])['variant'] if eligible else 'baseline'
 selection={'selected':chosen,'rule':'highest training CAGR improvement without worse drawdown','variants_tried':3,'train':results,'SPY':benchmark(qs),'protocol_sha256':hashlib.sha256((ROOT/'protocol.json').read_bytes()).hexdigest(),'created':datetime.datetime.now(datetime.timezone.utc).isoformat(),'code_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
 write('selection.json',selection);print(json.dumps({'selected':chosen,'train':[{k:r[k] for k in ['variant','cagr','max_drawdown']} for r in results]},indent=2))
def cohort_tables():
 tables=[];sectors=[];gates=[];predict=[];winners=[];survive=[];losers=[]
 for q,rs in frames.items():
  for scope in ['US','nonUS','Western','all']:
   subset=[r for r in rs if us(r[0])] if scope=='US' else [r for r in rs if not us(r[0])] if scope=='nonUS' else [r for r in rs if western(r[0])] if scope=='Western' else rs
   for mode in ['all','pit'] if scope=='US' else ['all']:
    sub=[r for r in subset if pit(r[0],q)] if mode=='pit' else subset
    for horizon in [1,4,12]:
     if qend(q,horizon)>END:continue
     values={r[0]:returns(r[0],q,horizon) for r in sub};bm=median([x for x in values.values() if x is not None]);spy=returns('SPY',q,horizon)
     for group in ['universe','quality','picks']:
      rr=sub if group=='universe' else [r for r in sub if r[1]=='PPPPP'] if group=='quality' else [r for r in sub if r[3]]
      vals=[values[r[0]] for r in rr];st=stats(vals,bm)
      price=stats([returns(r[0],q,horizon,kind=1) for r in rr]);usdvals=[returns(r[0],q,horizon,usd=True) for r in rr] if scope not in ['US','all'] else []
      tables.append({'quarter':q,'scope':scope,'membership':mode,'hold_quarters':horizon,'group':group,'selected':len(rr),**st,'price_mean':price['mean'],'price_median':price['median'],'hit_spy':mean([x>spy for x in vals if x is not None]) if spy is not None and scope=='US' else None,'SPY':spy if scope=='US' else None,'usd_mean':stats(usdvals)['mean'],'usd_n':stats(usdvals)['n']})
    if scope=='US':
     # Controller comparisons: same common endpoint, no horizon mixing.
     vals={r[0]:returns_to_end(r[0],q) for r in sub};bm=median([x for x in vals.values() if x is not None])
     for group,rr in [('universe',sub),('quality',[r for r in sub if r[1]=='PPPPP']),('picks',[r for r in sub if r[3]])]:
      tables.append({'quarter':q,'scope':scope,'membership':mode,'hold_quarters':'to_2026-09-30','group':group,'selected':len(rr),**stats([vals[r[0]] for r in rr],bm),'price_mean':stats([returns_to_end(r[0],q,1) for r in rr])['mean'],'SPY':returns_to_end('SPY',q)})
   if scope not in ['US','nonUS']:continue
   for group,rr in [('universe',subset),('quality',[r for r in subset if r[1]=='PPPPP']),('picks',[r for r in subset if r[3]])]:
    for s,n in collections.Counter(sector(r[0]) for r in rr).items():sectors.append({'quarter':q,'scope':scope,'group':group,'sector':s,'n':n,'fraction':n/len(rr)})
   if qend(q,12)>END:continue
   vals={r[0]:returns(r[0],q,12) for r in subset};valid=[v for v in vals.values() if v is not None]
   if not valid:continue
   cutoff=float(np.quantile(valid,.9));bm=median(valid);spy=returns('SPY',q,12)
   top=[r for r in subset if vals[r[0]] is not None and vals[r[0]]>=cutoff]
   counts=collections.Counter()
   for r in top:
    first=next((TESTS[n]+('_unknown' if ch=='U' else '_fail') for n,ch in enumerate(r[1]) if ch!='P'),None)
    mos=r[2] is not None and r[2]<=1-r[5]['discount'];expected=(r[7] or {}).get('expected') if len(r)>7 else None
    if first is None:first='selected' if r[3] else 'valuation_unavailable' if r[2] is None else 'margin_of_safety' if not mos else 'expected_return_or_other'
    counts[first]+=1
    if scope=='US':winners.append({'quarter':q,'id':r[0],'total_return_3y':vals[r[0]],'tests':r[1],'first_exclusion':first,'pm':r[2],'expected':expected,'margin_pass':mos,'all_failed_tests':','.join(TESTS[n] for n,ch in enumerate(r[1]) if ch=='F'),'unknown_tests':','.join(TESTS[n] for n,ch in enumerate(r[1]) if ch=='U')})
   for gate,n in counts.items():gates.append({'quarter':q,'scope':scope,'gate':gate,'n':n,'top_decile_n':len(top),'fraction':n/len(top)})
   for ti,test in enumerate(TESTS):
    for state in ['P','F','U']:
     for fin in ['all','financial','operating']:
      group=[r for r in subset if r[1][ti]==state and (fin=='all' or financial(r[0])==(fin=='financial'))];v=[vals[r[0]] for r in group if vals[r[0]] is not None]
      predict.append({'quarter':q,'period':'train' if qend(q,12)<='2015-12-31' else 'test' if q>='2016Q1' else 'embargo','scope':scope,'kind':fin,'test':test,'state':state,'selected':len(group),**stats(v,bm),'hit_spy':mean([x>spy for x in v]) if spy is not None and scope=='US' else None})
   if scope=='US':
    for r in subset:
     if r[3] and vals[r[0]] is not None and vals[r[0]]<0:losers.append({'quarter':q,'id':r[0],'return_3y':vals[r[0]],'SPY':spy,'tests':r[1]})
  sub=[r for r in rs if us(r[0])];excluded=[r for r in sub if not pit(r[0],q)]
  universe_set={r[0][:-3].replace('.','-') for r in sub};full=members(q)
  survive.append({'quarter':q,'current_survivor_rows':len(sub),'matched_pit_rows':len(sub)-len(excluded),'future_or_nonmembers':len(excluded),'full_pit_members':len(full),'pit_members_missing_from_analysis':len(full-universe_set),'picked_nonmembers':','.join(r[0] for r in excluded if r[3]),'examples':','.join(r[0] for r in excluded if r[0] in ['NVDA.US','AXON.US','FIX.US','MPWR.US'])})
 for name,rows in [('cohorts.csv',tables),('sector-mix.csv',sectors),('winner-gates.csv',gates),('quality-predictiveness.csv',predict),('us-top-decile.csv',winners),('survivorship.csv',survive),('losing-picks.csv',losers)]:csvout(name,rows)
 return tables

def returns_to_end(i,q,kind=2):
 a=quote(i,day(qend(q)),kind,True);b=quote(i,day(END),kind)
 return b[0]/a[0]-1 if a and b and b[1]>a[1] else None

def todays():
 rows=[];allrows=list(current.values());today=read(ROOT/'inputs/meta.json')['asOf'][:10]
 quotes={}
 for p in (ROOT/'inputs/prices').glob('*.json'):
  j=read(p)
  if isinstance(j,dict):quotes.update(j)
 def fair_now(r):
  qt=quotes.get(r['id']);model=(r.get('buyReturnInputs') or {}).get('model');v=r.get('v')
  if r.get('st')!='s' or r.get('t')!='PPPPP' or r.get('businessChanged') or r.get('dataQualityFlags') or not qt or not v or not model:return False
  price=qt[0];rate=.1;terminal=model['terminalGrowth'];flows=model['annual'];tc=model['terminalCash']
  if terminal>=rate:return False
  value=model['cashNow']+sum(cf/(1+rate)**(n+1) for n,cf in enumerate(flows))+(tc/(rate-terminal)/(1+rate)**len(flows) if tc>0 else 0)
  return 0<price<=v[1] and price<=value
 expanded=[r for r in allrows if r.get('w') and fair_now(r)]
 csvout('today-fair-value-universe.csv',[{'id':r['id'],'name':r['n'],'sector':r.get('s'),'previous_pick':bool(r.get('b')),'weight':1/len(expanded)} for r in expanded])
 for i,r in current.items():
  if not r.get('w') or not r.get('b'):continue
  a=read(ROOT/'inputs/current-analysis'/f'{i}.json') if (ROOT/'inputs/current-analysis'/f'{i}.json').exists() else {}
  metric=a.get('tests',{}).get('moat',{}).get('metrics',{});ret=metric.get('roteMedian',metric.get('roeMedian'))
  s=sector(i);univ=[x for x in allrows if x.get('w')];picks=[x for x in univ if x.get('b')]
  weight=sum(sector(x['id'])==s for x in univ)/len(univ)/sum(sector(x['id'])==s for x in picks)
  rows.append({'id':i,'name':r['n'],'sector':s,'kind':r['k'],'baseline_weight':1/len(picks),'sector_weight':weight,'financial_return':ret,'financial_15':'remove' if r['k'] in ['bank','insurer'] and (ret is None or ret<.15) else 'keep','fair_value':'keep' if fair_now(r) else 'fails current mechanical rule; investigate frozen price','fair_value_weight':1/len(expanded) if fair_now(r) else 0,'price_freeze':bool(r.get('priceTestFreeze'))})
 csvout('today-24.csv',rows)
 return rows

def run_test():
 if (OUT/'test-opened.json').exists():raise RuntimeError('Holdout already opened; do not tune or silently rerun')
 sel=read(OUT/'selection.json');write('test-opened.json',{'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'selection_sha256':hashlib.sha256((OUT/'selection.json').read_bytes()).hexdigest(),'code_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()})
 qs=[q for q in frames if '2016Q1'<=q<='2026Q2'];results=[]
 for scope in ['US','nonUS']:
  for v in VARIANTS:
   r,path=portfolio(qs,v,scope);results.append(r);write(f'test-path-{scope}-{v}.json.gz',path)
 for weight,pitonly,kind in [('cap',False,2),('equal',True,2),('equal',False,1)]:
  r,path=portfolio(qs,'baseline',weight=weight,pit_only=pitonly,kind=kind);r['price_kind']='price' if kind==1 else 'total';results.append(r);write(f'test-path-US-{weight}-{pitonly}-{kind}.json.gz',path)
 write('test-results.json',{'selected':sel['selected'],'results':results,'SPY':benchmark(qs),'EFA':benchmark(qs,'EFA'),'EEM':benchmark(qs,'EEM'),'ACWX':benchmark(qs,'ACWX'),'notes':'nonUS means direct Western non-US listings, USD converted; missing holdings cash; fixed quarter rebalance'} )
 cohort_tables();todays();write('price-inventory.json',price_meta)
 print(json.dumps({'selected':sel['selected'],'test':[{k:r[k] for k in ['variant','scope','weight','pit_only','cagr','max_drawdown','missing_allocations']} for r in results]},indent=2))
if __name__=='__main__':
 guard()
 if sys.argv[1]=='train':run_train()
 elif sys.argv[1]=='test':run_test()
 else:raise SystemExit('train | test')
