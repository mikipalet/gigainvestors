"""Compare current publication, same-input control, and the live archive."""
import json,collections,hashlib
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-3');e=r/'evidence';c=r/'corpus'
read=lambda p:json.loads(p.read_text())
def ds(p):return {i:a for f in(p/'dossiers').glob('*.json')for i,a in read(f).items()}
def ix(p):return {v['id']:v for f in(p/'index').glob('??.json')for v in read(f)}
old,new,control=ds(r/'baseline'),ds(r/'candidate-final'),ds(r/'baseline')
a,z,b=ix(r/'baseline'),ix(r/'candidate-final'),ix(r/'baseline');keys=['understandable','moat','economics','management','accounting']
freeze=set(read(c/'verdict-freeze.json')['ids'])
def mask(d):return ''.join(d['tests'][k]['result'][0].upper()for k in keys)
def state(d):return {k:d.get(k)for k in ['b','v','m','t']}
changes=[];drift=[]
for id in sorted(old):
 if id not in new:continue
 if mask(old[id])!=mask(new[id]):
  changed=[k for k in keys if old[id]['tests'][k]['result']!=new[id]['tests'][k]['result']]
  changes.append({'id':id,'before':mask(old[id]),'control':mask(control.get(id,old[id])),'after':mask(new[id]),'qualityBefore':mask(old[id])=='PPPPP','qualityAfter':mask(new[id])=='PPPPP','buyBefore':a.get(id,{}).get('b'),'buyAfter':z.get(id,{}).get('b'),'changedTests':changed,'reasons':{k:new[id]['tests'][k]['reasons']for k in changed},'metrics':{k:{'before':old[id]['tests'][k]['metrics'],'after':new[id]['tests'][k]['metrics']}for k in changed},'frozen':id in freeze})
 if id in b and a.get(id,{}).get('t')!=b[id]['t']:drift.append({'id':id,'live':a.get(id),'control':b[id]})
buys=[{'id':id,'before':state(row),'control':state(b[id])if id in b else None,'after':state(z[id])}for id,row in sorted(a.items())if id in z and row['b']!=z[id]['b']]
nulls=[];missing=[]
def compare(id,x,y,path):
 if isinstance(x,(int,float))and not isinstance(x,bool)and y is None:nulls.append({'id':id,'path':path,'before':x});return
 if isinstance(x,dict)and isinstance(y,dict):
  for k,v in x.items():
   if k in y:compare(id,v,y[k],path+'.'+k)
   else:lost(id,v,path+'.'+k)
 elif isinstance(x,list)and isinstance(y,list):
  if x and all(isinstance(v,list)and len(v)==2 and isinstance(v[0],(str,int))for v in x+y):
   values=dict(y)
   for period,v in x:
    if period in values:compare(id,v,values[period],path+'['+str(period)+']')
    else:lost(id,v,path+'['+str(period)+']')
  elif x and all(isinstance(v,dict)and 'fy'in v for v in x+y):
   values={v['fy']:v for v in y}
   for v in x:
    if v['fy']in values:compare(id,v,values[v['fy']],path+'['+str(v['fy'])+']')
    else:lost(id,v,path+'['+str(v['fy'])+']')
def lost(id,x,path):
 if isinstance(x,(int,float))and not isinstance(x,bool):missing.append({'id':id,'path':path,'before':x})
 elif isinstance(x,dict):
  for k,v in x.items():lost(id,v,path+'.'+k)
 elif isinstance(x,list):
  for n,v in enumerate(x):lost(id,v,path+'['+str(n)+']')
for id,d in old.items():
 if id in new:
  for k in ['tests','valuation','series','valueHistory']:compare(id,d.get(k),new[id].get(k),k)
protected=[];orderOnly=[]
for directory in ['prices','history','forward']:
 for p in(r/'baseline'/directory).glob('*.json'):
  after=r/'candidate-final'/directory/p.name
  x,y=read(p),read(after)if after.exists()else None
  if p.name=='companies.json' and directory=='history':
   for rows in [x,y]:
    if rows:
     for v in rows:v.pop('methodVersion',None)
   if x!=y and sorted(x,key=lambda v:v['id'])==sorted(y,key=lambda v:v['id']):orderOnly.append(directory+'/'+p.name)
   x,y=sorted(x,key=lambda v:v['id']),sorted(y,key=lambda v:v['id'])
  if x!=y:protected.append(directory+'/'+p.name)
summary={'baselineDossiers':len(old),'candidateDossiers':len(new),'missing':sorted(set(old)-set(new)),'added':sorted(set(new)-set(old)),'qualityMaskChanges':len(changes),'qualityGained':[v['id']for v in changes if not v['qualityBefore']and v['qualityAfter']],'qualityLost':[v['id']for v in changes if v['qualityBefore']and not v['qualityAfter']],'buyChanges':buys,'controlDrift':drift,'freezeCount':len(freeze),'freezeChanges':[id for id in freeze if old.get(id)!=new.get(id)],'numericNulls':len(nulls),'numericRemoved':len(missing),'valuationLosses':[id for id,d in old.items()if d.get('valuation')and not new.get(id,{}).get('valuation')],'protectedChanges':protected,'identityOrderOnly':orderOnly}
summary['valuationTupleChanges']=[id for id in a if id in z and any(a[id].get(k)!=z[id].get(k) for k in ['v','m'])]
summary['logoChanges']=[id for id in old if id in new and old[id]['company'].get('logo')!=new[id]['company'].get('logo')]
summary['indexLogoChanges']=[id for id in a if id in z and a[id].get('lg')!=z[id].get('lg')]
summary['unrelatedQualityChanges']=[v['id'] for v in changes if any(k not in ['understandable','moat'] for k in v['changedTests'])]
for name,data in [('release-audit',summary),('quality-changes',changes),('numeric-nulls',nulls),('numeric-removed',missing)]:
 (e/(name+'.json')).write_text(json.dumps(data,indent=2)+'\n')
print(json.dumps(summary,indent=2))
