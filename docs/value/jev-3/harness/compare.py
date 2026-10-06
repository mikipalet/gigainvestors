import os,json,csv,math
from pathlib import Path
root=Path(os.environ['PUBFIX_ROOT']);e=root/'evidence'
def read(p):return json.loads(p.read_text())
def dossiers(p):return {k:v for f in sorted((p/'dossiers').glob('*.json')) for k,v in read(f).items()}
def diffs(a,b,p=''):
 if a==b:return []
 if isinstance(a,dict) and isinstance(b,dict):
  return [d for k in sorted(a.keys()|b.keys()) for d in diffs(a.get(k),b.get(k),p+'.'+k)]
 return [{'path':p,'before':a,'after':b}]
before=dossiers(root/'baseline-out');after=dossiers(root/'dry-run')
assert before.keys()==after.keys()
attribution={r['id']:r for r in read(e/'attribution.json')}
rows=[];changes=[];unrelated=[];verdicts=[]
for id in sorted(after):
 a,b=before[id],after[id];d=diffs(a,b)
 if not d:continue
 changes.append({'id':id,'changes':d})
 for delta in d:
  p=delta['path']
  if not any(p==x or p.startswith(x+'.') for x in ['.valuation','.valuationReason','.requiredMos','.b','.priceTestFreeze','.dataQualityFlags','.tests.price','.ownerMemo','.priceStory']):unrelated.append({'id':id,**delta})
 # Quality and business claims may not change even when a price paragraph does.
 am=a.get('ownerMemo') or {};bm=b.get('ownerMemo') or {}
 if [l for l in am.get('lines',[]) if l['question']!=7]!=[l for l in bm.get('lines',[]) if l['question']!=7]:unrelated.append({'id':id,'path':'non-price owner memo'})
 av,bv=a.get('valuation') or {},b.get('valuation') or {}
 af,bf=bool(a.get('b')),bool(b.get('b'))
 if af!=bf:verdicts.append({'id':id,'before':af,'after':bf})
 if av!=bv or af!=bf or a.get('tests',{}).get('price')!=b.get('tests',{}).get('price'):
  annual=attribution.get(id,{}).get('annual',{})
  bs=bv.get('balanceSheet') or (attribution.get(id,{}).get('balance') or {});end=bs.get('end')
  rows.append({'id':id,'currency':av.get('currency'),'beforeValue':av.get('perShare',{}).get('mid'),'afterValue':bv.get('perShare',{}).get('mid'),'beforeBuy':af,'afterBuy':bf,'beforePriceTest':a.get('tests',{}).get('price',{}).get('result'),'afterPriceTest':b.get('tests',{}).get('price',{}).get('result'),'beforeMargin':a.get('requiredMos'),'afterMargin':b.get('requiredMos'),'annualEnd':annual.get('end'),'annualCash':annual.get('cash'),'annualDebt':annual.get('totalDebt'),'balanceEnd':end,'balanceFiled':bs.get('filed'),'availabilityAssumed':bs.get('filingDateAssumed',False),'source':bs.get('source'),'basis':bs.get('basis'),'currentCash':(attribution.get(id,{}).get('balance') or {}).get('values',{}).get('cash'),'currentDebt':(attribution.get(id,{}).get('balance') or {}).get('values',{}).get('totalDebt'),'unavailableReason':attribution.get(id,{}).get('reason'),'beforeNormalized':av.get('normalized'),'afterNormalized':bv.get('normalized'),'beforeNetDebt':av.get('netDebt'),'afterNetDebt':bv.get('netDebt')})
(e/'all-dossier-changes.json').write_text(json.dumps(changes,indent=2)+'\n')
(e/'changed-valuations.json').write_text(json.dumps(rows,indent=2)+'\n')
with (e/'changed-valuations.csv').open('w') as out:
 w=csv.DictWriter(out,fieldnames=list(rows[0]),lineterminator='\n');w.writeheader();w.writerows(rows)
summary={'beforeCount':len(before),'afterCount':len(after),'changedDossiers':len(changes),'changedValuationsOrPriceTests':len(rows),'changedBuyVerdicts':verdicts,'changedPriceTests':[{'id':r['id'],'before':r['beforePriceTest'],'after':r['afterPriceTest']} for r in rows if r['beforePriceTest']!=r['afterPriceTest']],'unrelated':unrelated,'frozenChanges':[id for id in read(root/'corpus/verdict-freeze.json')['ids'] if before.get(id)!=after.get(id)]}
(e/'comparison.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='changedPriceTests'},indent=2))
