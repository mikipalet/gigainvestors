import json,gzip,re,collections
from pathlib import Path
r=Path('.fix5c/nightly-7');a=Path('/Users/miki/value-corpus/publish-repo');b=r/'after-final';frozen=set(json.loads((r/'corpus/verdict-freeze.json').read_text())['ids']);out=[]
def key(x):
 if not x:return None
 for k in ['id','question','fy','year','date','key','label']:
  if all(isinstance(v,dict) and isinstance(v.get(k),(str,int)) for v in x):
   m={str(v[k]):v for v in x}
   if len(m)==len(x):return m
 if all(isinstance(v,list) and len(v)>=2 and (type(v[0])==int and 1900<=v[0]<=2200 or isinstance(v[0],str) and re.fullmatch(r'(?:\d{4}(?:-\d{2}(?:-\d{2})?)?|[A-Z0-9&.\-]+\.[A-Z]+)',v[0])) for v in x):
  m={str(v[0]):v[1:] for v in x}
  if len(m)==len(x):return m
 return None
def walk(file,x,y,p='',id=None):
 if type(x) in (int,float) and y is None:
  out.append({'file':file,'id':id,'path':p,'before':x,'after':None,'frozen':id in frozen});return
 if isinstance(x,dict) and isinstance(y,dict):
  for k in x.keys()&y.keys():walk(file,x[k],y[k],p+'/'+k,k if re.fullmatch(r'[A-Z0-9&.\-]+\.[A-Z]+',k) else id)
 elif isinstance(x,list) and isinstance(y,list):
  xx,yy=key(x),key(y)
  if xx is not None and yy is not None:
   for k in xx.keys()&yy.keys():walk(file,xx[k],yy[k],p+'/@'+k,k if re.fullmatch(r'[A-Z0-9&.\-]+\.[A-Z]+',k) else id)
  else:
   for i,(v,w) in enumerate(zip(x,y)):walk(file,v,w,p+'/'+str(i),id)
for p in a.rglob('*.json'):
 if '.git' in p.parts:continue
 rel=p.relative_to(a);q=b/rel
 if q.exists():walk(str(rel),json.loads(p.read_text()),json.loads(q.read_text()))
with gzip.open(r/'semantic-store-nulls.json.gz','wt') as f:json.dump(out,f)
summary={'occurrences':len(out),'frozenOccurrences':sum(x['frozen'] for x in out),'byDirectory':dict(collections.Counter(x['file'].split('/')[0] for x in out)),'byCompany':dict(collections.Counter(str(x['id']) for x in out)),'rows':out}
(r/'semantic-store-nulls-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='rows'}))
