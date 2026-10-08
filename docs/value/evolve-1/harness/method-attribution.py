"""Same-input attribution: candidate 3.7.0 analysis vs the bound 3.6.0 analysis, per test."""
import json,hashlib,collections
from pathlib import Path
r=Path('/Users/miki/data/value-evolve/.audit/evolve-1');c=r/'corpus';live=Path('/Users/miki/value-corpus');e=r/'evidence'
source=json.loads((e/'source-baseline.json').read_text());ids=json.loads((e/'released-ids.json').read_text())
keys=['understandable','moat','economics','management','accounting','price'];counts=collections.Counter();rows=[]
for id in ids:
 rel=f'analysis/{id}.json';old=live/rel;new=c/rel
 if not old.exists() or not new.exists():counts['absent']+=1;continue
 ob=old.read_bytes();assert hashlib.sha256(ob).hexdigest()==source[rel],rel
 a,b=json.loads(ob),json.loads(new.read_bytes())
 ta,tb=a.get('tests') or {},b.get('tests') or {}
 diff={k:[(ta.get(k)or{}).get('result'),(tb.get(k)or{}).get('result')] for k in keys if (ta.get(k)or{}).get('result')!=(tb.get(k)or{}).get('result')}
 va,vb=[((x.get('valuation')or{}).get('perShare')or{}).get('mid') for x in (a,b)]
 ta_,tb_=[(x.get('valuation')or{}).get('tier') for x in (a,b)]
 if ta_!=tb_:counts['tier:'+str(ta_)+'→'+str(tb_)]+=1
 if diff or va!=vb or ta_!=tb_:rows.append({'id':id,'tests':diff,'valueMid':[va,vb],'tier':[ta_,tb_]})
 for k in diff:counts[k+':'+'→'.join(map(str,diff[k]))]+=1
 if va!=vb:counts['valuationMidChanged']+=1
(e/'method-attribution.json').write_text(json.dumps({'released':len(ids),'counts':dict(sorted(counts.items())),'rows':rows},indent=1)+'\n')
print(json.dumps(dict(sorted(counts.items())),indent=1))
