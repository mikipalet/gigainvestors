"""All quality/value/price/buy changes, with no approval manifest or veto."""
from pathlib import Path
import json,csv
r=Path('.audit/evolve-1');e=r/'evidence'
read=lambda p:json.loads(p.read_text())
def dossiers(p):return {i:d for f in (p/'dossiers').glob('*.json') for i,d in read(f).items()}
def index(p):return {d['id']:d for f in (p/'index').glob('??.json') for d in read(f)}
old,new=dossiers(r/'baseline'),dossiers(r/'candidate-final');a,b=index(r/'baseline'),index(r/'candidate-final');keys=['understandable','moat','economics','management','accounting']
def snapshot(i,d,ix):
 v=d.get('valuation') or {};price=d['tests'].get('price',{})
 return {'quality':''.join(d['tests'][k]['result'][0].upper() for k in keys),'qualityTests':{k:d['tests'][k] for k in keys},'price':price.get('result'),'value':ix.get(i,{}).get('v'),'margin':ix.get(i,{}).get('m'),'buy':d['b'],'valuation':v}
changes=[]
for i in sorted(set(old)|set(new)):
 x=snapshot(i,old[i],a) if i in old else None;y=snapshot(i,new[i],b) if i in new else None
 compared=lambda z:None if z is None else {k:z[k] for k in ['quality','price','value','margin','buy']}
 if compared(x)!=compared(y):changes.append({'id':i,'before':x,'after':y})
summary={'baselineDossiers':len(old),'candidateDossiers':len(new),'indexedBefore':len(a),'indexedAfter':len(b),'missing':sorted(set(old)-set(new)),'added':sorted(set(new)-set(old)),'changes':len(changes),'qualityChanges':sum(x['before'] and x['after'] and x['before']['quality']!=x['after']['quality'] or False for x in changes),'valuationChanges':sum(x['before'] and x['after'] and x['before']['value']!=x['after']['value'] or False for x in changes),'valuationLosses':[i for i in a if a[i].get('v') and not b.get(i,{}).get('v')],'buyChanges':[x['id'] for x in changes if x['before'] and x['after'] and x['before']['buy']!=x['after']['buy']]}
(e/'release-audit.json').write_text(json.dumps(summary,indent=2)+'\n');(e/'current-release-changes.json').write_text(json.dumps(changes,indent=2)+'\n')
with (e/'current-release-changes.csv').open('w') as f:
 w=csv.writer(f);w.writerow(['id','quality_before','quality_after','value_before','value_after','buy_before','buy_after'])
 for x in changes:w.writerow([x['id']]+[(x[k] or {}).get(v) for v in ['quality','value','buy'] for k in ['before','after']])
print(json.dumps(summary,indent=2));assert not summary['missing'],'Lost released dossiers'
