import json
from pathlib import Path
r=Path('/Users/miki/data/regress/run2');c=r/'corpus'
fields={'DVA.US':['sharesOutstanding'],'BMI.US':['sharesOutstanding'],'HON.US':['sharesOutstanding'],'HCI.US':['sharesOutstanding'],'NMIH.US':['dilutedShares'],'CFG-PH.US':['netIncome','equity','goodwill','intangibles'],'LAMR.US':['acquisitions'],'NOVT.US':['nonRecurring'],'VCTR.US':['nonRecurring'],'SBSI.US':['creditLossProvision','loans'],'BOKF.US':['creditLossProvision','loans']}
results=[]
for id,keys in fields.items():
 years=json.loads((c/f'analysis/inputs/{id}.json').read_text())['memoYears'];factFile=c/f'raw/sec-companyfacts/{id}.json'
 if not factFile.exists() and '-' in id:factFile=c/f'raw/sec-companyfacts/{id.split("-")[0]}.US.json'
 facts=json.loads(factFile.read_text());row={'id':id,'factFile':str(factFile.relative_to(c)),'observations':[]}
 for y in years[-10:]:
  for k in keys:
   value=y.get(k)
   if value is None or value=='':continue
   try:value=float(value)
   except (TypeError,ValueError):continue
   matches=[]
   for ns,tags in facts.get('facts',{}).items():
    for tag,fact in tags.items():
     for unit,values in fact.get('units',{}).items():
      for f in values:
       if f.get('end')==y['end']and f.get('val')==value and f.get('form')in ['10-K','20-F','40-F']and f.get('filed','')<='2026-10-06':matches.append({'concept':ns+':'+tag,'unit':unit,'fact':f})
   row['observations'].append({'fy':y['fy'],'end':y['end'],'field':k,'value':value,'provenance':y.get('provenance',{}).get(k),'matches':matches[-4:]})
 results.append(row)
Path('docs/value/regress-2/quality-primary-evidence.json').write_text(json.dumps(results,indent=2)+'\n')
print([(x['id'],sum(bool(o['matches'])for o in x['observations']),len(x['observations']))for x in results])
# Exact cached filing facts supporting or failing to corroborate refreshed balances.
results=[]
for id in ['GL.US','NMIH.US','NTB.US','INMD.US','CFG-PH.US']:
 raw=json.loads((c/f'raw/eodhd/{id}.json').read_text());quarters=raw.get('Financials',{}).get('Balance_Sheet',{}).get('quarterly',{})
 f=c/f'raw/sec-companyfacts/{id}.json'
 if not f.exists()and '-'in id:f=c/f'raw/sec-companyfacts/{id.split("-")[0]}.US.json'
 facts=json.loads(f.read_text())if f.exists()else {};observations=[]
 for end,y in [(e,y)for e,y in sorted(quarters.items()) if e in ['2025-12-31','2026-06-30']]:
  for k in ['cashAndShortTermInvestments','cash','shortLongTermDebtTotal','totalStockholderEquity','goodWill','intangibleAssets','commonStockSharesOutstanding']:
   value=y.get(k)
   if value is None or value=='':continue
   try:value=float(value)
   except (TypeError,ValueError):continue
   matches=[]
   for ns,tags in facts.get('facts',{}).items():
    for tag,fact in tags.items():
     for unit,values in fact.get('units',{}).items():
      for v in values:
       if v.get('end')==end and v.get('val')==value and not v.get('start')and v.get('filed','')<='2026-10-06':matches.append({'concept':ns+':'+tag,'unit':unit,'fact':v})
   observations.append({'end':end,'field':k,'value':value,'matches':matches[-4:]})
 results.append({'id':id,'factFile':str(f.relative_to(c))if f.exists()else None,'observations':observations})
Path('docs/value/regress-2/buy-primary-evidence.json').write_text(json.dumps(results,indent=2)+'\n')
print([(x['id'],[(o['end'],o['field'],o['value'],len(o['matches']))for o in x['observations']])for x in results])
