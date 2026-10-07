"""Attach observed input/reason differences without attributing data drift to UI code."""
from pathlib import Path
import json,csv,collections
r=Path('/Users/miki/data/value-rules/.audit/rules-5');e=r/'evidence'
read=lambda p:json.loads(p.read_text())
def ds(p):return {i:d for f in(p/'dossiers').glob('*.json')for i,d in read(f).items()}
a,b=ds(r/'baseline'),ds(r/'candidate-final');changes=read(e/'current-release-changes.json')
keys=['method','version','currency','discountRate','terminalGrowth','bondYield','shares','tier','normalized','growth','netCash','netDebt','leverage','capitalReturns','balanceSheet','perShare','perShareTrading','roe','growthRetention','bookPerShare','payout','navPerShare']
counts=collections.Counter()
for row in changes:
 x,y=a[row['id']],b[row['id']];vx,vy=x.get('valuation')or{},y.get('valuation')or{}
 diffs={k:{'before':vx.get(k),'after':vy.get(k)}for k in keys if vx.get(k)!=vy.get(k)}
 row['valuationInputChanges']=diffs;row['valuationReasonBefore']=x.get('valuationReason');row['valuationReasonAfter']=y.get('valuationReason');row['priceTestBefore']=x['tests'].get('price');row['priceTestAfter']=y['tests'].get('price')
 reasons=[]
 for k,v in row['reasons'].items():reasons.append(k+': '+'; '.join(v))
 if row['before']['value']!=row['after']['value']:
  if row['after']['value']is None:reasons.append('Comparable trading value is absent from the candidate index; see full dossier/price evidence. Existing publication behavior, not a selected rule correction.');counts['tradingValueRemoved']+=1
  elif row['before']['value']is None:reasons.append('Comparable trading value became available under existing publication calculations.');counts['tradingValueAdded']+=1
  else:reasons.append('Existing publication repricing; observed valuation fields changed: '+(', '.join(diffs)or'no underlying model fields; inspect trading index conversion')+'.');counts['tradingValueChanged']+=1
 if row['before']['price']!=row['after']['price']:reasons.append('Price verdict '+str(row['before']['price'])+' → '+str(row['after']['price'])+'; before/after price metrics and reasons retained in JSON.')
 if row['before']['margin']!=row['after']['margin']:reasons.append('Existing safety tier '+str(row['before']['margin'])+' → '+str(row['after']['margin'])+'.')
 row['explanation']=' '.join(reasons)
(e/'current-release-changes.json').write_text(json.dumps(changes,indent=2)+'\n')
with(e/'current-release-changes.csv').open('w')as f:
 w=csv.writer(f);w.writerow(['id','quality_before','quality_after','value_before','value_after','margin_before','margin_after','price_before','price_after','buy_before','buy_after','reason'])
 for row in changes:w.writerow([row['id'],row['before']['quality'],row['after']['quality'],row['before']['value'],row['after']['value'],row['before']['margin'],row['after']['margin'],row['before']['price'],row['after']['price'],row['before']['buy'],row['after']['buy'],row['explanation']])
(e/'current-value-change-counts.json').write_text(json.dumps(dict(counts),indent=2)+'\n');print(dict(counts))
