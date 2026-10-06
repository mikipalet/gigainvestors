"""Fiscal-period matched release audit. Keeps raw and effective changes separate."""
import json,collections,hashlib,os
from pathlib import Path
root=Path.home()/'data/regress/run2';corpus=root/'corpus';baseline=root/'baseline'
def load(p):return json.loads(p.read_text())
def dossiers(p):return {id:a for f in sorted((p/'dossiers').glob('*.json'))for id,a in load(f).items()}
a=dossiers(baseline)
candidate=Path(os.environ['REGRESS_CANDIDATE'])if os.environ.get('REGRESS_CANDIDATE')else None
b=dossiers(candidate)if candidate else {id:load(corpus/'analysis'/f'{id}.json')for id in a if(corpus/'analysis'/f'{id}.json').exists()}
freeze=set(load(corpus/'verdict-freeze.json')['ids'])
tests=['understandable','moat','economics','management','accounting']
changes=[];nulls=[];missing=[];quality=[];valuations=[];removed=[]
def missing_numbers(id,x,path):
 if isinstance(x,(int,float))and not isinstance(x,bool):removed.append({'id':id,'path':path,'before':x,'frozen':id in freeze})
 elif isinstance(x,dict):
  for k,v in x.items():missing_numbers(id,v,path+'.'+k)
 elif isinstance(x,list):
  for n,v in enumerate(x):missing_numbers(id,v,path+'['+str(n)+']')
def compare(id,x,y,path):
 if isinstance(x,(int,float))and not isinstance(x,bool)and y is None:nulls.append({'id':id,'path':path,'before':x,'frozen':id in freeze});return
 if isinstance(x,dict)and isinstance(y,dict):
  for k,v in x.items():
   if k in y:compare(id,v,y[k],path+'.'+k)
   else:missing_numbers(id,v,path+'.'+k)
 elif isinstance(x,list)and isinstance(y,list):
  if x and all(isinstance(v,list)and len(v)==2 and isinstance(v[0],(int,str))for v in x+y):
   z=dict(y)
   for k,v in x:
    if k in z:compare(id,v,z[k],path+'['+str(k)+']')
    else:missing_numbers(id,v,path+'['+str(k)+']')
  elif x and all(isinstance(v,dict)and 'fy'in v for v in x+y):
   z={v['fy']:v for v in y}
   for v in x:
    if v['fy']in z:compare(id,v,z[v['fy']],path+'['+str(v['fy'])+']')
for id,old in a.items():
 new=b.get(id)
 if new is None:missing.append(id);continue
 diff={k:[old.get('tests',{}).get(k,{}).get('result'),new.get('tests',{}).get(k,{}).get('result')]for k in tests if old.get('tests',{}).get(k,{}).get('result')!=new.get('tests',{}).get(k,{}).get('result')}
 if diff:changes.append({'id':id,'tests':diff,'frozen':id in freeze,'reasons':{k:new['tests'][k].get('reasons',[])for k in diff}})
 q=lambda d:all(d.get('tests',{}).get(k,{}).get('result')=='pass'for k in tests)
 if q(old)!=q(new):quality.append({'id':id,'before':q(old),'after':q(new),'tests':diff,'frozen':id in freeze})
 if old.get('valuation')is not None and new.get('valuation')is None:valuations.append({'id':id,'reason':new.get('valuationReason'),'before':old['valuation'],'frozen':id in freeze})
 for k in ['tests','valuation','series','valueHistory']:
  x=old.get(k);y=new.get(k)
  if k=='tests'and not candidate:x={key:v for key,v in (x or {}).items()if key!='price'}
  compare(id,x,y,k)
buys=[]
if candidate:
 def indexes(p):return {r['id']:r for f in (p/'index').glob('??.json')for r in load(f)}
 oldrows=indexes(baseline);newrows=indexes(candidate)
 for id,r in oldrows.items():
  n=newrows.get(id)
  if n and r['b']!=n['b']:buys.append({'id':id,'before':{k:r.get(k)for k in ['b','v','m','t']},'after':{k:n.get(k)for k in ['b','v','m','t']}})
summary={'baseline':len(a),'candidate':len(b),'missing':missing,'added':sorted(set(b)-set(a)),'changedTests':len(changes),'qualityChanges':quality,'numericNullFields':len(nulls),'numericNullCompanies':len({r['id']for r in nulls}),'numericRemovedFields':len(removed),'valuationNulls':[r['id']for r in valuations],'buyChanges':buys,'unfrozen':{'changedTests':sum(not r['frozen']for r in changes),'qualityChanges':[r for r in quality if not r['frozen']],'numericNullFields':sum(not r['frozen']for r in nulls),'numericNullCompanies':sorted({r['id']for r in nulls if not r['frozen']}),'valuationNulls':[r['id']for r in valuations if not r['frozen']]}}
name='candidate'if candidate else 'raw'
for suffix,data in [('summary',summary),('test-changes',changes),('numeric-nulls',nulls),('valuation-nulls',valuations),('numeric-removed',removed)]:
 (root/f'evidence/{name}-{suffix}.json').write_text(json.dumps(data,indent=2)+'\n')
print(json.dumps(summary,indent=2))
