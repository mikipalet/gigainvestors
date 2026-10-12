"""Statement-level currency discontinuities in the analysis years (memoYears) of every
published company: a statement group whose level changes by an FX-sized factor between
consecutive years (against the company's own currencies), compared with the other groups."""
import json,math,os,sys,statistics
corpus=os.path.expanduser('~/value-corpus')
sw=json.load(open(sys.argv[1]));U=sw['fxUsdPerUnit']
CC={'BR':'BRL','US':'USD','CN':'CNY','HK':'HKD','GB':'GBP','JP':'JPY','KR':'KRW','IN':'INR','MX':'MXN','AR':'ARS','PE':'PEN','CL':'CLP','CO':'COP','ZA':'ZAR','TW':'TWD','TR':'TRY','ID':'IDR','SE':'SEK','NO':'NOK','DK':'DKK','CH':'CHF','AU':'AUD','CA':'CAD','PL':'PLN','NZ':'NZD','SG':'SGD','KZ':'KZT','PH':'PHP','TH':'THB','MY':'MYR','IL':'ILS','CZ':'CZK','HU':'HUF','RU':'RUB','EG':'EGP'}
def maj(c):
  c=(c or '').upper(); return {'GBX':'GBP','ZAC':'ZAR','ILA':'ILS'}.get(c,c)
G={'income':['revenue','grossProfit','operatingIncome','preTaxIncome'],'balance':['totalAssets','totalLiabilities','currentAssets','currentLiabilities'],'cash':['ocf','capex','da']}
hits=[]
for r in sw['rows']:
  i=r['id']
  try: inp=json.load(open(f'{corpus}/analysis/inputs/{i}.json')); co=json.load(open(f'{corpus}/companies/{i}.json'))
  except Exception: continue
  ys=inp.get('memoYears') or []
  home={maj(co.get('currency')),maj(r['label']),'USD','EUR',CC.get(co.get('country'),'')}-{''}
  for y0,y1 in zip(ys[-11:],ys[-10:]):
    if y1['fy']!=y0['fy']+1: continue
    L=maj(y1.get('currency') or r['label'])
    g={}
    for name,fs in G.items():
      rs=[y1[f]/y0[f] for f in fs if y0.get(f) and y1.get(f) and y0[f]>0 and y1[f]>0]
      if len(rs)>=2: g[name]=statistics.median(rs)
    if len(g)<2: continue
    for name,v in g.items():
      others=[o for n,o in g.items() if n!=name]
      for X in home:
        if X==L or not U.get(X) or not U.get(L): continue
        k=U[L]/U[X]  # amounts in L -> X  : value in X = value_L * k ; if amounts became X while labelled L, ratio ~ 1/U[X]*U[L]... 
        for kk in (k,1/k):
          if abs(math.log(kk))<math.log(2.5): continue
          rel=v/statistics.median(others) if name else v
          if abs(rel/kk-1)<=.15: hits.append((i,r['label'],co.get('currency'),y1['fy'],name,round(v,2),round(rel,2),X,round(kk,2),{n:round(o,2) for n,o in g.items()}))
  # whole-company jump (all groups) with flat shares
  for y0,y1 in zip(ys[-11:],ys[-10:]):
    if y1['fy']!=y0['fy']+1: continue
    L=maj(y1.get('currency') or r['label'])
    vals=[y1[f]/y0[f] for f in ('revenue','totalAssets','equity','ocf') if y0.get(f) and y1.get(f) and y0[f]>0 and y1[f]>0]
    sh=(y1.get('dilutedShares') or 0)/(y0.get('dilutedShares') or 1) if y0.get('dilutedShares') else None
    if len(vals)>=3 and sh and .67<sh<1.5:
      m=statistics.median(vals)
      for X in home:
        if X==L or not U.get(X) or not U.get(L): continue
        for kk in (U[L]/U[X],U[X]/U[L]):
          if abs(math.log(kk))>=math.log(2.5) and abs(m/kk-1)<=.15 and max(vals)/min(vals)<1.8:
            hits.append((i,r['label'],co.get('currency'),y1['fy'],'ALL',round(m,2),None,X,round(kk,2),[round(v,2) for v in vals]))
json.dump(hits,open(sys.argv[2],'w'),default=str)
seen=set()
for h in sorted(hits,key=lambda h:(h[0],h[3])):
  k=(h[0],h[3],h[4])
  if k in seen: continue
  seen.add(k); print(*h)
