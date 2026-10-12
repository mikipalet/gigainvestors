import json,os
H=os.path.expanduser('~/data/value-outlier-work'); R=H+'/audit'
live={x['id']:x for x in json.load(open(H+'/sweep-live-all.json'))}
cand={x['id']:x for x in json.load(open(H+'/sweep-candidate-all.json'))}
hits={x['id'] for x in json.load(open(H+'/sweep-live.json'))}|{x['id'] for x in json.load(open(H+'/sweep-candidate.json'))}
ev=json.load(open(H+'/evidence-candidate.json'))
diff={c[0]:c for c in json.load(open(R+'/evidence/analysis-diff.json'))}
def rows(repo):
  out={}
  for f in os.listdir(repo+'/index'):
    if f!='default.json':
      for r in json.load(open(repo+'/index/'+f)): out[r['id']]=r
  return out
C=rows(R+'/candidate-final'); L=rows(os.path.expanduser('~/value-corpus/publish-repo'))
ind={}
for id in ev:
  try: ind[id]=(json.load(open(f'{R}/corpus/analysis/{id}.json')).get('company') or {}).get('industry')
  except Exception: ind[id]=None
res=[]
for id in sorted([i for i in ev if i in hits],key=lambda i:-(live.get(i,{}).get('pv') or cand.get(i,{}).get('pv') or 0)):
  l=live.get(id,{}); c=cand.get(id,{}); e=ev[id]; d=diff.get(id)
  sec={k:v['ratio'] for k,v in (e.get('sec') or {}).get('reconcile',{}).items()}
  hosts=sorted({v[1] for v in e['inputs'].values() if v[1]})
  pm=e.get('priceMonths') or []
  res.append(dict(liveHit=live.get(id,{}).get('hit'),candHit=cand.get(id,{}).get('hit'),id=id,name=(C.get(id) or L.get(id) or {}).get('n'),industry=ind.get(id),k=(C.get(id) or {}).get('k'),tests=(C.get(id) or {}).get('t'),
    liveBuy=bool(L.get(id,{}).get('b')),candBuy=bool(C.get(id,{}).get('b')),
    live=dict(pv=l.get('pv'),er=l.get('er'),oey=l.get('oeYield')),cand=dict(pv=c.get('pv'),er=c.get('er'),oey=c.get('oeYield')),
    liveV=(L.get(id,{}).get('v') or [None,None])[1],candV=(C.get(id,{}).get('v') or [None,None])[1],price=l.get('price') or c.get('price'),cur=(C.get(id) or L.get(id) or {}).get('cur'),
    rules=d[5] if d else [],sec=sec,hosts=hosts,priceFrom=pm[0] if pm else None,priceTo=pm[-1] if pm else None,flags=(C.get(id) or {}).get('dataQualityFlags')))
json.dump(res,open(H+'/sweep-table.json','w'),indent=1)
for r in res:
  print(f"{r['id']:<12} {(r['industry'] or '')[:26]:<26} {r['tests']} L{'B' if r['liveBuy'] else '-'}C{'B' if r['candBuy'] else '-'} live pv={r['live']['pv']} er={r['live']['er']} oey={r['live']['oey']} | cand pv={r['cand']['pv']} er={r['cand']['er']} oey={r['cand']['oey']} | {r['rules']} sec={r['sec']} src={r['hosts']} px {r['priceFrom']}->{r['priceTo']}")
