from pathlib import Path
import json,re,hashlib,gzip
live=Path('/Users/miki/value-corpus/publish-repo');out=Path('/tmp/value-int6-store');load=lambda p:json.loads(p.read_text())
scope=load(Path('.ttm-1/history-scope.json'));frozen=set(load(Path('.ttm-1/corpus/verdict-freeze.json'))['ids'])
dossiers={k:v for p in (out/'dossiers').glob('*.json') for k,v in load(p).items()};approved={(c['file'],c['id'],c['test']):c for c in scope['changes']}
changes=[];unapproved=[];price=[];missing=[]
for f in (live/'history').glob('*.json'):
 if not re.fullmatch(r'\d{4}(?:Q[1-4])?\.json',f.name):continue
 a={r[0]:r for r in load(f)};b={r[0]:r for r in load(out/'history'/f.name)}
 for id,x in a.items():
  y=b.get(id)
  if y is None:missing.append([f.name,id]);continue
  # A historical row's price check consists of price margin and complete price metadata.
  if x[2]!=y[2] or x[5:6]!=y[5:6]:
   c=approved.get((f.name,id,'price-check'));item={'file':f.name,'id':id,'company':dossiers.get(id,{}).get('company',{}).get('name',id),'test':'price-check','old':{'margin':x[2],'price':x[5] if len(x)>5 else None},'new':{'margin':y[2],'price':y[5] if len(y)>5 else None},'ltm':c.get('periods') if c else None};changes.append(item)
   if not c or c['old']!=item['old'] or c['new']!=item['new'] or not item['ltm'] or id in frozen:price.append(item)
  for i,test in enumerate(['understandable','moat','economics','management','accounting','buy']):
   old,new=(x[1][i],y[1][i]) if i<5 else (x[3],y[3])
   if old==new:continue
   c=approved.get((f.name,id,test));item={'file':f.name,'id':id,'company':dossiers.get(id,{}).get('company',{}).get('name',id),'test':test,'old':old,'new':new,'ltm':(c.get('period') or c.get('periods')) if c else None}
   changes.append(item)
   if not c or c['old']!=old or c['new']!=new or not item['ltm'] or id in frozen:unapproved.append(item)
checks={'zeroUnapprovedHistoricalFlips':not unapproved,'zeroUnapprovedHistoricalPriceChanges':not price,'zeroLostHistoricalRows':not missing}
result={'pass':all(checks.values()),'checks':checks,'historicalVerdictChanges':len(changes),'changes':changes,'unapproved':unapproved,'priceChanges':price,'missing':missing,'scoping':{k:len(v) if isinstance(v,list) else v for k,v in scope.items()}}
Path('.int6/history-gate.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='changes'},indent=2))
