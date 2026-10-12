import json,os,sys
def load(repo):
  rows={}
  for f in os.listdir(repo+'/index'):
    if f!='default.json':
      for r in json.load(open(repo+'/index/'+f)): rows[r['id']]=r
  prices={}
  for f in os.listdir(repo+'/prices'): prices.update(json.load(open(repo+'/prices/'+f)))
  return rows,prices
L,lp=load(sys.argv[1]); C,cp=load(sys.argv[2])
lb={i for i,r in L.items() if r.get('b')}; cb={i for i,r in C.items() if r.get('b')}
print('live buys',len(lb),'western',sum(1 for i in lb if L[i].get('w')),'| candidate buys',len(cb),'western',sum(1 for i in cb if C[i].get('w')))
print('removed',sorted(lb-cb)); print('added',sorted(cb-lb))
out={'live':len(lb),'candidate':len(cb),'liveWestern':sum(1 for i in lb if L[i].get('w')),'candidateWestern':sum(1 for i in cb if C[i].get('w')),'removed':[],'added':[]}
for i in sorted(lb-cb)+sorted(cb-lb):
  l,c=L.get(i,{}),C.get(i,{})
  e={'id':i,'name':c.get('n') or l.get('n'),'western':bool(c.get('w') or l.get('w')),'price':(cp.get(i) or lp.get(i) or [None])[0],
     'liveValue':l.get('v') and l['v'][1],'candidateValue':c.get('v') and c['v'][1],'liveTests':l.get('t'),'candidateTests':c.get('t'),'livePr':l.get('pr'),'candidatePr':c.get('pr'),'flags':c.get('dataQualityFlags')}
  out['removed' if i in lb else 'added'].append(e); print(e)
json.dump(out,open(sys.argv[3],'w'),indent=1)
