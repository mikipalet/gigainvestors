from pathlib import Path
import json,gzip,collections,hashlib,re
r=Path('.fix5c/nightly-9');before=Path('/Users/miki/value-corpus/publish-repo');after=r/'after-final'
load=lambda p:json.loads(p.read_text())
def dossiers(root):return {k:v for p in (root/'dossiers').glob('*.json') for k,v in load(p).items()}
a,b=dossiers(before),dossiers(after);frozen=set(load(r/'corpus/verdict-freeze.json')['ids'])
nulls=[];removed=[]
def numeric(x):return type(x) in (int,float)
def keyed(x):
 if not x:return None
 for key in ['id','question','fy','year','date','key','label']:
  if all(isinstance(v,dict) and key in v and isinstance(v[key],(str,int)) for v in x):
   m={str(v[key]):v for v in x}
   if len(m)==len(x):return m
 if all(isinstance(v,list) and len(v)>=2 and (type(v[0])==int and 1900<=v[0]<=2200 or isinstance(v[0],str) and re.fullmatch(r'\d{4}(?:-\d{2}(?:-\d{2})?)?',v[0])) for v in x):
  m={str(v[0]):v[1:] for v in x}
  if len(m)==len(x):return m
 return None

def walk(id,x,y,p):
 if numeric(x) and y is None:nulls.append({'id':id,'path':p,'before':x,'after':None});return
 if isinstance(x,dict) and isinstance(y,dict):
  for k in x.keys()&y.keys():walk(id,x[k],y[k],p+'/'+str(k))
 elif isinstance(x,list) and isinstance(y,list):
  kx,ky=keyed(x),keyed(y)
  if kx is not None and ky is not None:
   for k in kx.keys()&ky.keys():walk(id,kx[k],ky[k],p+'/@'+k)
  else:
   for i,(v,w) in enumerate(zip(x,y)):walk(id,v,w,p+'/'+str(i))
for id in sorted(a.keys()&b.keys()):
 walk(id,a[id],b[id],'')
 for field,rows in a[id].get('series',{}).items():
  target=dict(b[id].get('series',{}).get(field,[]))
  for fy,val in rows:
   if numeric(val) and fy not in target:removed.append({'id':id,'field':field,'fy':fy,'before':val})
(r/'semantic-numeric-losses.json').write_text(json.dumps({'numericToNull':nulls,'numericToNullOutsideFrozen':[x for x in nulls if x['id'] not in frozen],'removedSeriesObservations':removed},indent=2)+'\n')
search={row[0] for p in (after/'search').glob('*.json') if p.name!='manifest.json' for row in load(p)['rows']}
short=[id for id,d in b.items() if d['status']=='insufficient_data'];oldpred=[id for id,d in a.items() if d.get('predecessorHistory')];pred=[id for id,d in b.items() if d.get('predecessorHistory')];history=load(after/'history/index.json')
aa,ba=load(before/'aliases.json'),load(after/'aliases.json');aliasdiff=[k for k in aa.keys()|ba.keys() if (k in frozen or aa.get(k) in frozen or ba.get(k) in frozen) and aa.get(k)!=ba.get(k)]
features={'historyQuarters':len(history['quarters']),'historyYears':len(history['years']),'sinceSummary2018Q3':history['perQuarter'].get('2018Q3'),'shortHistoryCompanies':len(short),'shortFindableCompanies':sum(id in search for id in short),'shortMissingSearch':[id for id in short if id not in search],'predecessorCompanies':pred,'lostPredecessors':sorted(set(oldpred)-set(pred)),'lostPredecessorsSearchable':sorted(set(oldpred)&search),'priceStoryDossiers':sum(bool(d.get('priceStory')) for d in b.values()),'canonicalFrozenAliasMismatches':aliasdiff,'requestedHistories':[{'id':id,'before':a[id].get('historyCoverage'),'after':b[id].get('historyCoverage')} for id in ['EQNR.OL','4043.JP','3457.JP','EVN.AU','NTRS.US','AENA.MC','HMSO.LSE']]}
(r/'live-features.json').write_text(json.dumps(features,indent=2)+'\n')
with gzip.open(r/'candidate-manifest.json.gz','wt') as f:json.dump({str(p.relative_to(after)):hashlib.sha256(p.read_bytes()).hexdigest() for p in after.rglob('*') if p.is_file()},f)
print(json.dumps({'semanticNumericToNull':len(nulls),'nullExamples':nulls[:20],'removedSeriesObservations':len(removed),'removedByCompany':dict(collections.Counter(x['id'] for x in removed)),'features':features},indent=2))
