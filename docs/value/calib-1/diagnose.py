import json,math
from pathlib import Path
r=Path.home()/'value-corpus';o=Path.home()/'data/calib'
live=json.loads((o/'live-DPZ.US.json').read_text());ys=json.loads((r/'analysis/inputs/DPZ.US.json').read_text())['memoYears'][-10:];facts=json.loads((r/'raw/sec-companyfacts/DPZ.US.json').read_text())['facts']['us-gaap'];hist=dict(live['priceHistory'])
def rho(pairs):
 x,y=zip(*pairs)
 def rank(a):return [sorted(a).index(v)+1 for v in a]
 x,y=rank(x),rank(y);mx=sum(x)/len(x);my=sum(y)/len(y);return sum((a-mx)*(b-my)for a,b in zip(x,y))/math.sqrt(sum((a-mx)**2 for a in x)*sum((b-my)**2 for b in y))
for mode in ['live','new','new-shares-old-price','instant','average-price']:
 pairs=[]
 for y in ys:
  fy=y['fy'];end=y['end'];s=y['dilutedShares'];p=y['marketCap']/s
  oldS=dict(live['tests']['management']['series']['shares'])[fy];oldP=dict(live['tests']['management']['series']['marketCap'])[fy]/oldS
  if mode=='live':s,p=oldS,oldP
  elif mode=='new-shares-old-price':p=oldP
  elif mode=='instant':
   rows=[f for f in facts['CommonStockSharesOutstanding']['units']['shares']if f['end']==end and f.get('form')=='10-K'];rows.sort(key=lambda x:x['filed']);s=rows[-1]['val']if rows else s;p=oldP;print(fy,s)
  elif mode=='average-price':p=y['averageSharePrice']
  cap=s*p;pairs.append((y['buybacks']/cap,y['netIncome']/cap))
 print(mode,rho(pairs))
