"""Per-company evidence for the outlier sweep: key inputs with their provenance
source, SEC reconciliation where an SEC annual exists, price-history path."""
import json,os,sys,datetime as D
from urllib.parse import urlparse
C=sys.argv[1]  # corpus dir
ids=sys.argv[2].split(',')
REV=['Revenues','RevenueFromContractWithCustomerExcludingAssessedTax','Revenue','SalesRevenueNet']
NI=['NetIncomeLoss','ProfitLossAttributableToOwnersOfParent','ProfitLoss']
OCF=['NetCashProvidedByUsedInOperatingActivities','CashFlowsFromUsedInOperatingActivities']
CAPEX=['PaymentsToAcquirePropertyPlantAndEquipment','PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities']
DA=['DepreciationDepletionAndAmortization','DepreciationAndAmortization','DepreciationAmortisationAndImpairmentLossReversalOfImpairmentLossRecognisedInProfitOrLoss']
def sec(id):
  for d in ('sec-annual',):
    p=f'{C}/raw/{d}/{id}.json'
    if os.path.exists(p):
      j=json.load(open(p)); return j['facts']['facts'],j.get('source')
  return None,None
def annual(g,concepts,end):
  for ns in g.values():
    for k in concepts:
      if k not in ns: continue
      for u,vals in ns[k]['units'].items():
        for v in vals:
          s=v.get('start')
          if s and v['end']==end and 340<(D.date.fromisoformat(v['end'])-D.date.fromisoformat(s)).days<390: return v['val'],u,k
  return None
def host(p):
  s=(p or {}).get('source','') or ''
  if not s: return None
  if s.startswith('raw/'): return s.split('/')[1]
  return urlparse(s).netloc or s
out={}
for id in ids:
  f=json.load(open(f'{C}/fundamentals/{id}.json')); y=sorted(f['years'],key=lambda y:y['fy'])[-1]
  pv=y.get('provenance') or {}
  e={'fy':y['fy'],'end':y['end'],'currency':f.get('currency'),
     'inputs':{k:[y.get(k),host(pv.get(k)),(pv.get(k) or {}).get('method')] for k in ('revenue','netIncome','da','capex','ocf','cash','totalDebt','dilutedShares','minorityInterest','equity')}}
  g,src=sec(id)
  if g:
    rec={}
    for key,con in (('revenue',REV),('netIncome',NI),('ocf',OCF),('capex',CAPEX),('da',DA)):
      a=annual(g,con,y['end'])
      if a and y.get(key) is not None: rec[key]={'filing':a[0],'unit':a[1],'concept':a[2],'vendor':y.get(key),'ratio':round(y[key]/a[0],3) if a[0] else None}
    e['sec']={'source':src,'reconcile':rec}
  try:
    h=json.load(open(f'{C}/prices-history/{id}.json')); e['priceMonths']=[(d,round(p,3)) for d,p in h[-13::3]]
  except Exception: pass
  out[id]=e
print(json.dumps(out))
