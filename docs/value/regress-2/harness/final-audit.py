import hashlib,json,re,collections,subprocess
from pathlib import Path
r=Path('/Users/miki/data/regress/run2');e=r/'evidence';b=r/'baseline';n=r/'candidate-final';c=r/'corpus'
read=lambda p:json.loads(p.read_text())
def dossiers(root):return {id:d for f in (root/'dossiers').glob('*.json')for id,d in read(f).items()}
old=dossiers(b);new=dossiers(n)
def cells(old,new,path):
 parts=re.findall(r'[^.\[\]]+',path)
 def walk(a,b,parts):
  if not parts:return a,b
  key,*rest=parts
  if isinstance(a,dict):return walk(a.get(key),b.get(key)if isinstance(b,dict)else None,rest)
  if isinstance(a,list):
   pairs=all(isinstance(v,list)and len(v)==2 for v in a)
   fiscal=all(isinstance(v,dict)and 'fy'in v for v in a)
   if pairs or fiscal:
    period=lambda v:v[0]if pairs else v['fy']
    # missing_numbers emitted positional paths inside an entirely absent tree;
    # compare their actual fiscal key in the candidate, never its new position.
    positional=key.isdigit()and int(key)<len(a)
    row=a[int(key)]if positional else next((v for v in a if str(period(v))==key),None)
    if row is None:return None,None
    other=next((v for v in b if period(v)==period(row)),None)if isinstance(b,list)else None
    if pairs and not positional:return walk(row[1],other[1]if other is not None else None,rest)
    if pairs and positional and rest:
     col=int(rest[0]);return walk(row[col],other[col]if other is not None else None,rest[1:])
    return walk(row,other,rest)
   if key.isdigit()and int(key)<len(a):return walk(a[int(key)],b[int(key)]if isinstance(b,list)and int(key)<len(b)else None,rest)
  return None,None
 return walk(old,new,parts)
numbers=[]
for name in ['candidate-numeric-removed','candidate-numeric-nulls']:
 original=read(Path('docs/value/regress-1')/(name+'.json'))
 rows=[]
 for v in original:
  live,after=cells(old[v['id']],new[v['id']],v['path'])
  rows.append({**v,'live':live,'candidate':after,'liveMatchesAudit':live==v['before'],'restoredOrRefreshed':isinstance(after,(int,float))and not isinstance(after,bool)})
 (e/(name+'-resolution.json')).write_text(json.dumps(rows,indent=2)+'\n')
 numbers.append({'kind':name,'cells':len(rows),'presentInLive':sum(isinstance(v['live'],(int,float))for v in rows),'restoredOrRefreshed':sum(v['restoredOrRefreshed']for v in rows)})
freeze=read(c/'verdict-freeze.json')['ids'];freezeChanges=[id for id in freeze if old[id]!=new.get(id)]
indexes=lambda root:{row['id']:row for f in(root/'index').glob('??.json')for row in read(f)}
a=indexes(b);z=indexes(n);approved={v['id']:v for v in read(Path('scripts/value/approved-verdict-changes.json'))};buys=[]
state=lambda row:{k:row.get(k)for k in ['b','v','m']}
for id,prior in a.items():
 if id in z and prior.get('b')!=z[id].get('b'):buys.append({'id':id,'before':state(prior),'after':state(z[id]),'approved':id in approved and state(prior)==approved[id]['before']and state(z[id])==approved[id]['after']and prior['t']==z[id]['t']})
review=[{'id':id,'shares':d['valuation']['shares'],'reasons':d['valuation'].get('shareReviewReasons'),'asOf':d['asOf']}for id,d in new.items()if d.get('valuation',{} )and d['valuation'].get('publishedShareReview')]
retained=[{'id':id,'asOf':d['valuation']['retainedPublishedAt'],'reason':d['valuation'].get('retainedPublishedReason')}for id,d in new.items()if d.get('valuation')and d['valuation'].get('retainedPublishedAt')]
losses=[id for id,d in old.items()if d.get('valuation')and not new.get(id,{}).get('valuation')]
summary={'baselineDossiers':len(old),'candidateDossiers':len(new),'missing':sorted(set(old)-set(new)),'added':sorted(set(new)-set(old)),'freezeCount':len(freeze),'freezeChanges':freezeChanges,'numericResolution':numbers,'buyChanges':buys,'shareReviewCount':len(review),'valuationLosses':losses,'retainedUnresolvedValuations':retained}
(e/'release-audit.json').write_text(json.dumps(summary,indent=2)+'\n');(e/'published-share-reviews.json').write_text(json.dumps(review,indent=2)+'\n')
print(json.dumps(summary,indent=2));assert not summary['missing']and not freezeChanges and len(buys)==3 and all(v['approved']for v in buys)
assert numbers[0]['restoredOrRefreshed']==6209
