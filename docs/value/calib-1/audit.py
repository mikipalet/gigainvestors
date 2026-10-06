import json, collections, hashlib, shutil
from pathlib import Path
R=Path.home()/'value-corpus'; O=Path.home()/'data/calib'; (O/'today').mkdir(exist_ok=True);(O/'live').mkdir(exist_ok=True)
freeze=json.loads((R/'verdict-freeze.json').read_text()); print('freeze shape',type(freeze).__name__,list(freeze)[:8])
flips=[];nulls=[];missing=[];quality=[];counts=collections.Counter();manifest={}
def compare(id,a,b,path=''):
 if isinstance(a,(int,float)) and not isinstance(a,bool) and b is None: nulls.append({'id':id,'path':path,'live':a});return
 if isinstance(a,dict) and isinstance(b,dict):
  for k,v in a.items():
   if k in b:compare(id,v,b[k],path+'.'+k)
 elif isinstance(a,list) and isinstance(b,list):
  if a and all(isinstance(x,list) and len(x)==2 and isinstance(x[0],(int,str)) for x in a+b):
   bm=dict(b)
   for k,v in a:
    if k in bm:compare(id,v,bm[k],path+'['+str(k)+']')
  elif a and all(isinstance(x,dict) and 'fy'in x for x in a+b):
   bm={x['fy']:x for x in b}
   for x in a:
    if x['fy']in bm:compare(id,x,bm[x['fy']],path+'['+str(x['fy'])+']')
for p in sorted((R/'publish-repo/dossiers').glob('*.json')):
 for id,a in json.loads(p.read_text()).items():
  counts['live']+=1;f=R/'analysis'/f'{id}.json'
  if not f.exists():missing.append(id);continue
  b=json.loads(f.read_text());counts['matched']+=1
  (O/'live'/f'{id}.json').write_text(json.dumps(a));shutil.copyfile(f,O/'today'/f'{id}.json')
  manifest[id]=hashlib.sha256(f.read_bytes()).hexdigest()
  diffs={k:[v.get('result'),b.get('tests',{}).get(k,{}).get('result')] for k,v in a.get('tests',{}).items() if k!='price' and v.get('result')!=b.get('tests',{}).get(k,{}).get('result')}
  if diffs:flips.append({'id':id,'tests':diffs})
  aq=all(a.get('tests',{}).get(k,{}).get('result')=='pass' for k in ['understandable','moat','economics','management','accounting']);bq=all(b.get('tests',{}).get(k,{}).get('result')=='pass' for k in ['understandable','moat','economics','management','accounting'])
  if aq!=bq:quality.append({'id':id,'live':aq,'today':bq,'tests':diffs})
  for k in ['tests','valuation','series','valueHistory']:compare(id,a.get(k),b.get(k),k)
summary={'counts':dict(counts),'missing':missing,'testFlipCompanies':len(flips),'qualityFlips':quality,'nullCompanies':len(set(x['id']for x in nulls)),'nullFields':len(nulls),'nullPathCounts':dict(collections.Counter(x['path']for x in nulls).most_common(25))}
for name,data in [('audit-summary',summary),('test-flips',flips),('numeric-nulls',nulls),('source-manifest',manifest),('freeze',freeze)]: (O/f'{name}.json').write_text(json.dumps(data,indent=2))
print(json.dumps(summary,indent=2)[:8000])
