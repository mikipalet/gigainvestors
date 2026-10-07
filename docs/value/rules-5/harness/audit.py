"""Enumerate every released quality/value/price/buy difference and held proposal."""
from pathlib import Path
import json,hashlib,collections
r=Path('/Users/miki/data/value-rules/.audit/rules-5');e=r/'evidence';c=r/'corpus'
read=lambda p:json.loads(p.read_text())
def ds(p):return {i:d for f in(p/'dossiers').glob('*.json')for i,d in read(f).items()}
def ix(p):return {d['id']:d for f in(p/'index').glob('??.json')for d in read(f)}
old,new=ds(r/'baseline'),ds(r/'candidate-final');a,b=ix(r/'baseline'),ix(r/'candidate-final');keys=['understandable','moat','economics','management','accounting']
mask=lambda d:''.join(d['tests'][k]['result'][0].upper()for k in keys)
changes=[]
for id in sorted(set(old)&set(new)):
 x,y=old[id],new[id];before={'quality':mask(x),'price':x['tests'].get('price',{}).get('result'),'value':a.get(id,{}).get('v'),'margin':a.get(id,{}).get('m'),'buy':x['b']};after={'quality':mask(y),'price':y['tests'].get('price',{}).get('result'),'value':b.get(id,{}).get('v'),'margin':b.get(id,{}).get('m'),'buy':y['b']}
 if before!=after:changes.append({'id':id,'before':before,'after':after,'reasons':{k:y['tests'][k]['reasons']for k in keys if x['tests'][k]['result']!=y['tests'][k]['result']},'attribution':'No selected rule change; current copied-input refresh/publication behavior, requiring explicit disclosure'})
freeze=set(read(c/'verdict-freeze.json')['ids']);freeze_changes=[i for i in freeze if old.get(i)!=new.get(i)]
proposals=read(c/'staging/preserved-buy-transitions.json')
preserved=[{'id':row['id'],'dossierIdentical':old.get(row['id'])==new.get(row['id']),'indexIdentical':a.get(row['id'])==b.get(row['id'])}for row in proposals]
(e/'preserved-records.json').write_text(json.dumps(preserved,indent=2)+'\n')
assert all(v['dossierIdentical']and v['indexIdentical']for v in preserved),'Unapproved transition changed a released record'
summary={'baselineDossiers':len(old),'candidateDossiers':len(new),'indexedBefore':len(a),'indexedAfter':len(b),'missing':sorted(set(old)-set(new)),'added':sorted(set(new)-set(old)),'changes':len(changes),'qualityChanges':sum(x['before']['quality']!=x['after']['quality']for x in changes),'valuationChanges':sum(x['before']['value']!=x['after']['value']or x['before']['margin']!=x['after']['margin']for x in changes),'priceChanges':sum(x['before']['price']!=x['after']['price']for x in changes),'buyChanges':[x for x in changes if x['before']['buy']!=x['after']['buy']],'frozenRecords':len(freeze),'frozenRecordChanges':freeze_changes,'approvedBuyChanges':read(Path('scripts/value/approved-verdict-changes.json'))}
(e/'release-audit.json').write_text(json.dumps(summary,indent=2)+'\n');(e/'current-release-changes.json').write_text(json.dumps(changes,indent=2)+'\n')
print(json.dumps(summary,indent=2));assert not summary['buyChanges']and not summary['missing']and not freeze_changes
