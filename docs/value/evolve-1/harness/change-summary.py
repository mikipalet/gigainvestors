"""Classify every published change: method-attributed (same-input analysis differs) or input/publication drift; float noise below 1e-9 relative is not a value change."""
import json,csv,collections,math
from pathlib import Path
e=Path('.audit/evolve-1/evidence')
ch=json.loads((e/'current-release-changes.json').read_text())
att={r['id']:r for r in json.loads((e/'method-attribution.json').read_text())['rows']}
held={t['id'] for t in json.loads(Path('.audit/evolve-1/corpus/staging/preserved-buy-transitions.json').read_text())}
def same(a,b):
 if a is None or b is None:return a is b
 return all(math.isclose(x,y,rel_tol=1e-9,abs_tol=0) for x,y in zip(a,b))
rows=[];c=collections.Counter()
for x in ch:
 b,a=x['before']or{},x['after']or{}
 q=b.get('quality')!=a.get('quality');v=not same(b.get('value'),a.get('value'));m=b.get('margin')!=a.get('margin');p=b.get('price')!=a.get('price');buy=b.get('buy')!=a.get('buy')
 if not(q or v or m or p or buy):c['floatNoiseOnly']+=1;continue
 source='method' if x['id'] in att and x['id']!='ZH.US' else 'input/publication drift'
 for k,f in [('quality',q),('value',v),('margin',m),('priceVerdict',p),('buy',buy)]:
  if f:c[k+':'+source]+=1
 rows.append({'id':x['id'],'source':source,'quality_before':b.get('quality'),'quality_after':a.get('quality'),'value_mid_before':(b.get('value')or[None,None])[1],'value_mid_after':(a.get('value')or[None,None])[1],'margin_before':b.get('margin'),'margin_after':a.get('margin'),'price_before':b.get('price'),'price_after':a.get('price'),'buy_before':b.get('buy'),'buy_after':a.get('buy'),'buy_flip_held_by_continuity':x['id']in held})
with (e/'release-changes-material.csv').open('w')as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
summary={'materialChanges':len(rows),'counts':dict(sorted(c.items())),'heldBuyTransitions':len(held)}
(e/'release-change-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
