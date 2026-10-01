"""Independent arithmetic: no imports from application valuation/formatting code."""
import json, pathlib, math, os
stage=pathlib.Path('.audit/staging');store=stage/'store'
def read(p):return json.loads(p.read_text())
dossiers={k:v for p in (store/'dossiers').glob('*.json') for k,v in read(p).items()}
prices={k:v for p in (store/'prices').glob('*.json') for k,v in read(p).items()}
sources=read(stage/'independent-sources.json');results=[]
for source in sources:
 stat=os.statvfs('/');assert stat.f_bavail*stat.f_frsize>5*1024**3,'DISK STOP'
 id=source['id'];d=dossiers.get(id,{});v=d.get('valuation');q=prices.get(id);r={'id':id,'quote':q,'yahooDifferencePct':source.get('quoteDifferencePct')}
 if not v:
  r.update(status='no valuation',reason=d.get('valuationReason'),note='No displayed buy price or expected return to reproduce.');results.append(r);continue
 g=v['growth'];rate=v['discountRate'];shares=v['shares'];normalized=v['normalized'];fx=v.get('perShareTrading',{}).get('fxRate',1);mos=d.get('requiredMos',.25)
 if v['method']=='owner_earnings':
  earned=normalized;pv=0;terminal=v['terminalGrowth'];rows=[]
  for year in range(1,11):
   annual=g+(terminal-g)*(year-1)/9 if v.get('tier')=='compounder' else g if year<=5 else g+(terminal-g)*(year-5)/5
   earned*=1+annual;discounted=earned/(1+rate)**year;pv+=discounted;rows.append([year,annual,earned,discounted])
  terminal_pv=earned*(1+terminal)/(rate-terminal)/(1+rate)**10
  mid=(pv+terminal_pv+v['netCash'])/shares
  cash=normalized/shares;r.update(annualCashflows=rows,terminalPresentValue=terminal_pv,annualPresentValue=pv,cashAdjustment=v['netCash'])
 elif v['method']=='book_value':
  roe=v.get('financialReturn',{}).get('roe',next(x['value'] for x in v['bridge'] if 'normalized return' in x['label']))
  multiple=min(4,max(0,(roe-g)/(rate-g)));mid=normalized*multiple;cash=v['financialReturn']['cashPerShare'];r.update(roe=roe,multiple=multiple)
 else:
  mid=normalized;g=0;cash=normalized*v['navReturn']['cagr']
 buy=mid*fx*(1-mos)
 expected=cash*fx/q[0]+g if q else None
 assert math.isclose(mid,v['perShare']['mid'],rel_tol=1e-10,abs_tol=1e-9),(id,mid,v['perShare']['mid'])
 r.update(status='pass',method=v['method'],currency=v['currency'],listingCurrency=d['company']['currency'],shares=shares,normalized=normalized,growth=g,discountRate=rate,fx=fx,marginOfSafety=mos,calculatedValue=mid,displayedValue=v['perShare']['mid'],buyPrice=buy,buyDisplay=f'{buy:.2f}',expectedReturn=expected,expectedDisplay=f'{expected*100:.1f}%' if expected is not None else None)
 # Check the actual visible top band, independently of the application's arithmetic.
 capture=stage/'consistency'/f'{id}.json'
 if capture.exists() and q:
  text=read(capture)['surfaces'].get('top',{}).get('text','').replace('−','-')
  # Locale grouping and at most two decimal places, including prices above 1000.
  visible=f'{buy:,.2f}'.rstrip('0').rstrip('.')
  r['topContainsBuyPrice']=f"{r['listingCurrency']} {visible}" in text
  r['topContainsExpectedReturn']=r['expectedDisplay'] in text
  r['topText']=text
  assert r['topContainsBuyPrice'],(id,'buy price not reproduced in rendered top band',visible)
  assert r['topContainsExpectedReturn'],(id,'expected return not reproduced in rendered top band',r['expectedDisplay'])
 results.append(r)
(stage/'hand-math.json').write_text(json.dumps(results,indent=2))
print(json.dumps({'companies':len(results),'calculated':sum(r['status']=='pass' for r in results),'noValuation':sum(r['status']=='no valuation' for r in results)}))
