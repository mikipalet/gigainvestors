"""Source-bound input deltas for every public verdict, buy, and numeric loss.
This records evidence; it does not grant controller approval or assert a vendor
observation is a primary-source correction.
"""
import json,collections
from pathlib import Path
root=Path.home()/'data/regress';live=Path.home()/'value-corpus';corpus=root/'corpus'
def read(p):
 try:return json.loads(p.read_text())
 except FileNotFoundError:return None
summary=read(root/'evidence/candidate-summary.json')
changes=read(root/'evidence/candidate-test-changes.json')
nulls=read(root/'evidence/candidate-numeric-nulls.json');vals=read(root/'evidence/candidate-valuation-nulls.json')
removed=read(root/'evidence/candidate-numeric-removed.json')
ids=sorted({r['id']for rows in [changes,nulls,vals,summary['buyChanges'],removed]for r in rows})
keys=['revenue','netIncome','commonNetIncome','dilutedShares','sharesOutstanding','cash','totalDebt','equity','goodwill','intangibles','totalAssets','ocf','capex','sbc','marketCap','currency','end','netRevenue','efficiencyRatio','insuranceFloat']
result=[]
for id in ids:
 before=read(live/'analysis/inputs'/f'{id}.json')or{};after=read(corpus/'analysis/inputs'/f'{id}.json')or{}
 old={y['fy']:y for y in before.get('memoYears',[])};new={y['fy']:y for y in after.get('memoYears',[])}
 delta=[]
 for fy,y in new.items():
  for k in keys:
   if fy in old and old[fy].get(k)!=y.get(k):delta.append({'fy':fy,'field':k,'before':old[fy].get(k),'after':y.get(k),'provenance':y.get('provenance',{}).get(k)})
 a=read(corpus/'analysis'/f'{id}.json')or{}
 result.append({'id':id,'report':a.get('report'),'inputYearsBefore':sorted(old),'inputYearsAfter':sorted(new),'changedAnnualInputs':delta,'qualityChanges':[r for r in changes if r['id']==id],'buyChanges':[r for r in summary['buyChanges']if r['id']==id],'numericNulls':[r for r in nulls if r['id']==id],'removedNumericFields':[r for r in removed if r['id']==id],'valuationNulls':[{'reason':r.get('reason'),'before':r['before']}for r in vals if r['id']==id],'latestValuationBalance':a.get('valuation',{}).get('balanceSheet')if a.get('valuation')else None})
(root/'evidence/changed-input-evidence.json').write_text(json.dumps(result,indent=2)+'\n')
print('Evidence records:',len(result),'annual input deltas:',sum(len(r['changedAnnualInputs'])for r in result))
