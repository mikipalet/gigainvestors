"""Independent annual-source reconciliations; run audit-sources.py and audit-recompute.ts first."""
import json,pathlib
s=pathlib.Path('.audit/staging');sources=json.load(open(s/'independent-sources.json'));tags=json.load(open(s/'source-tags.json'));corrected=json.load(open(s/'corrected-fundamentals.json'));urls={x['id']:x['url'] for x in json.load(open(s/'annual-report-urls.json'))}
# Reconciliations transcribed from the actual annual balance sheets and notes.
# Absolute reporting-currency values. Debt basis is recorded rather than silently equating debt with lease-adjusted enterprise capital.
reconciled={
'LULU.US':(1807202000,0,0,'No borrowings; operating leases excluded'),
'ZTS.US':(2310e6,9042e6,889e6,'Long-term borrowing carrying value; excludes operating leases'),
'WKL.AS':(932e6,4972e6,563e6,'Gross debt including leases; adjusted net debt excludes collateral and deferred divestment receipts'),
'ACN.US':(11478729000+5945000,5034169000+114484000+3034213000,3700169000,'Borrowings plus operating leases'),
'GOOGL.US':(30708e6+96135e6,46547e6+1996e6+2500e6+15954e6,10049e6,'Borrowings plus finance and operating leases'),
'JPM.US':(343338e6-29000e6,435206e6+64776e6,16625e6,'Unrestricted cash; borrowing debt excludes customer deposits and operating leases; AFS portfolio excluded'),
'KO.US':(10270e6+3602e6,43941e6+1495e6+56e6+1722e6,8779e6,'Borrowings plus operating leases'),
'AAPL.US':(35934e6+18763e6,90678e6+7979e6+1230e6+12490e6,15421e6,'Borrowings, commercial paper and both lease classes'),
'CBG.LSE':(2101.8e6,2188.3e6,0,'Cash-flow note cash equivalents excluding restricted accounts; summary balance-sheet borrowings; deposits excluded'),
'7203.JP':(12659622e6,17581104e6+25624365e6,1238974e6,'Current plus noncurrent debt; includes finance subsidiary borrowing; dividends paid to common holders'),
'ADANIENT.NSE':((6266.67+2506.65)*1e7,113701.85*1e7,150.04*1e7,'Borrowings, leases and trade credits; cash excludes other bank balances'),
'NVDA.US':(10605e6+51951e6,8468e6+2944e6,974e6,'Borrowings plus operating leases; marketable securities current'),
'MSFT.US':(20935e6+55908e6,40294e6+66594e6+21925e6,26445e6,'Borrowings plus both lease classes'),
'AMZN.US':(86810e6+36219e6,65648e6+2748e6+455e6+101538e6,0,'Borrowing carrying amounts plus both lease classes'),
'META.US':(35873e6+45719e6,58744e6+25153e6+1184e6,5324e6,'Borrowings plus both lease classes'),
'AVGO.US':(16178e6,61984e6+3152e6,11142e6,'Borrowings and finance leases; operating leases excluded'),
'TSLA.US':(16513e6+27546e6,6584e6+1569e6+223e6,0,'Borrowings and finance leases; operating leases excluded'),
'AXP.US':(47792e6-169e6+742e6,56387e6+1371e6,2271e6,'Borrowings excluding deposits; published total rounds 1m higher'),
'BAC.US':(231845e6-6500e6+7474e6,317816e6+48088e6,9563e6,'Borrowings; excludes deposits, long-term securities and restricted cash'),
'CVX.US':(6471e6,39781e6+977e6+5985e6,12751e6,'Borrowings and operating leases; finance leases in reported borrowing total'),
'OXY.US':(1968e6,22396e6+955e6,1594e6,'Borrowings and both lease classes; dividends include preferred distributions'),
'CB.US':(2470e6-198e6+4840e6,15728e6+1499e6+422e6,1505e6,'Borrowings excluding operating leases; long-term portfolio excluded from cash'),
'MCO.US':(2384e6+64e6,6994e6+357e6,701e6,'Borrowings plus operating leases'),
'KHC.US':(2615e6,21219e6,1898e6,'Borrowings and finance leases; operating leases excluded'),
'DVA.US':(676438000+24303000,10273189000+2601142000,0,'Borrowings and operating leases; cash excludes restricted balances'),
}
manual={'WKL.AS':(6125e6,1308e6,231.8e6),'CBG.LSE':(659.5e6,-77.9e6,149.9e6),'7203.JP':(50684952e6,3848098e6,13033273748),'ADANIENT.NSE':(100468.61*1e7,9339.47*1e7,1254378122)}
results=[]
for r in sources:
 id=r['id'];y=corrected.get(id,json.load(open(str(pathlib.Path(__import__('os').environ.get('VALUE_CORPUS_DIR',str(pathlib.Path.home()/'value-corpus')))/'fundamentals'/(id+'.json')))))['years'][-1];cash,debt,div,note=reconciled[id]
 if id in manual:rev,ni,shares=manual[id]
 else:
  sv=r['sourceValues'];rev=sv.get('revenue',{}).get('value');ni=sv['netIncome']['value'];shares=sv['dilutedShares']['value']
  if id in ['JPM.US','AXP.US']:rev=tags[id]['RevenuesNetOfInterestExpense']
  if id in ['CB.US','OXY.US']:rev=tags[id]['Revenues']
  if id=='KHC.US':rev=tags[id]['RevenueFromContractWithCustomerIncludingAssessedTax']
 primary=dict(revenue=rev,netIncome=ni,dilutedShares=shares,cash=cash,totalDebt=debt,dividendsPaid=div)
 checks=[]
 for key,value in primary.items():
  actual=y.get(key);delta=None if actual is None else actual-value;match=actual is not None and abs(delta)<=max(1,abs(value)*.00005)
  checks.append(dict(field=key,primary=value,corrected=actual,difference=delta,match=match))
 results.append(dict(id=id,end=r.get('sourceEnd',r['end']),currency=y['currency'],source=urls.get(id,json.load(open('lib/value/completeness/audit-facts.json')).get(id,[{}])[0].get('source',r.get('source'))),checks=checks,netCash=cash-debt,debtBasis=note,sharesBasis='annual diluted weighted-average shares',price=r.get('publishedQuote'),yahooDifferencePct=r.get('quoteDifferencePct')))
json.dump(results,open(s/'primary-review.json','w'),indent=2)
print([(r['id'],[x for x in r['checks'] if not x['match']]) for r in results if not all(x['match'] for x in r['checks'])])

assert all(x['match'] for r in results for x in r['checks']), 'Annual-source reconciliation failed'
