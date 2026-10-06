import json,hashlib
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-2');e=r/'evidence';c=r/'corpus';control=r/'control-analyses'
read=lambda p:json.loads(p.read_text())
keys=['understandable','moat','economics','management','accounting'];mask=lambda d:''.join(d['tests'][k]['result'][0].upper()for k in keys)
rows=[];inputDrift=[];unrelated=[];allInputs=[]
for id in read(e/'released-ids.json'):
 p=control/f'analysis/{id}.json';q=c/f'analysis/{id}.json'
 if not p.exists()or not q.exists():continue
 a,b=read(p),read(q);ap=control/f'analysis/inputs/{id}.json';bp=c/f'analysis/inputs/{id}.json'
 if ap.exists()and bp.exists():
  ai,bi=read(ap),read(bp)
  same=all(ai.get(k)==bi.get(k)for k in ['sections','reportingCurrency','derivedValues','memoYears'])
  allInputs.append({'id':id,'same':same,'control':hashlib.sha256(ap.read_bytes()).hexdigest(),'candidate':hashlib.sha256(bp.read_bytes()).hexdigest()})
  if not same:inputDrift.append(id)
 else:same=False
 changed=[k for k in keys if a['tests'][k]['result']!=b['tests'][k]['result']]
 if not changed:continue
 row={'id':id,'company':b['company']['name'],'before':mask(a),'after':mask(b),'sameInputs':same,'changedTests':changed,'reasons':{k:b['tests'][k]['reasons']for k in changed},'evidence':{k:{'before':a['tests'][k],'after':b['tests'][k]}for k in changed},'qualityBefore':mask(a)=='PPPPP','qualityAfter':mask(b)=='PPPPP','valuationChanged':a.get('valuation')!=b.get('valuation')}
 rows.append(row)
 if not same or any(k not in ['understandable','moat']for k in changed):unrelated.append(id)
for name,data in [('method-attribution',rows),('same-input-binding',allInputs),('attribution-summary',{'changed':len(rows),'inputDrift':inputDrift,'unrelatedChanges':unrelated,'qualityGained':[v['id']for v in rows if v['qualityAfter']and not v['qualityBefore']],'qualityLost':[v['id']for v in rows if v['qualityBefore']and not v['qualityAfter']]})]:
 (e/(name+'.json')).write_text(json.dumps(data,indent=2)+'\n')
print('Method changes',len(rows),'input drift',inputDrift,'unrelated',unrelated)
