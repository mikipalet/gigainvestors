import json,os
H=os.path.expanduser('~/data/value-outlier-work')
t=json.load(open(H+'/sweep-table.json'))
rev=json.load(open('/mnt/HC_Volume_107024928/value-outlier/lib/value/reviewed-input-errors.json'))
split={'1925.JP','2282.JP','285A.JP','3099.JP','4062.JP','4452.JP','5706.JP','5801.JP','5802.JP','7911.JP','8035.JP','8053.JP','8309.JP','8316.JP','8766.JP'}
jpcapex={'2282.JP','4005.JP','4324.JP','4689.JP','4901.JP','5411.JP','6301.JP','6762.JP','7013.JP','7751.JP','8604.JP','9201.JP','9432.JP','9766.JP'}
suspect={
 'GDG.AU':'Suspected: consolidated cash includes A$6.05bn of benefit-fund investments held for investment-bond policyholders (vendor short-term investments) against A$6.4bn non-current liabilities; not flagged because the audited FY2026 balance sheet was not retrieved. Not a Buy (fails quality).',
 'QLT.LSE':'Suspected: wealth platform whose consolidated cash may include policyholder funds; not verified. Not a Buy.',
 'RAT.LSE':'Suspected: wealth manager with a banking subsidiary; consolidated cash may back client deposits; not verified. Not a Buy.',
 '005380.KO':'Suspected: consolidated cash includes the captive-finance arm (Hyundai Capital/Card), so cash at time zero exceeds the price and the IRR is not meaningful; not verified against DART. Not a Buy (fails quality).',
 '000270.KO':'Inputs internally consistent; consolidated cash may include finance-subsidiary balances; not verified against DART. Not a Buy.',
}
def decide(r):
  i=r['id']; rules=r['rules']; sec=r['sec']
  recon=bool(sec) and all(abs(v-1)<.02 for k,v in sec.items() if k in ('revenue','netIncome','ocf'))
  if i in rev: return 'Data error, flagged', rev[i]['reason']
  if any(x.startswith('E2') for x in rules): return 'Data error, fixed','10-Q balance sheet 2026-06-30 delivered in thousands-as-units (cash US$412.2bn vs US$412.2m in the 10-Q); rejected by the new unit-scale check, previous balance used.'
  if i in split: return 'Data error, fixed','Share split after the annual report not applied to the share count (price on the post-split basis); now applied from the report’s own year-end price (P/E × EPS) against the split-restated history.'
  if i in jpcapex: return 'Data error, fixed','Capital spending tagged with an issuer extension concept (or only in the capex overview) was read as zero; EDINET extraction now reads it.'
  if any(x.startswith('E1') for x in rules):
    if i=='PRG.US': return 'Data error, fixed','Vendor D&A includes depreciation of lease merchandise (US$1.59bn in the FY2025 10-K; other D&A US$24m) while merchandise purchases (US$1.70bn) are operating cash flows; owner earnings now operating cash flow less capex and SBC. Still a Buy at the corrected value.'
    if i=='UPBD.US': return 'Data error, fixed','Vendor D&A includes depreciation of rental merchandise (US$1.38bn, FY2025 10-K) whose purchases (US$1.45bn) are operating cash flows; same rule as PRG.'
    return 'Data error, fixed','D&A replenished inside operating cash flow (rule E1); owner earnings now operating cash flow less capex and SBC.'
  if i in suspect: return 'Not confirmed (follow-up)',suspect[i]
  e3=any(x.startswith('E3') for x in rules)
  base='Material minority interests: consolidated cash now allocated to the parent by its share of equity (rule E3). ' if e3 else ''
  if e3: return 'Perimeter corrected; otherwise real', base+('Revenue, net income and operating cash flow equal the filing.' if recon else 'Other inputs internally consistent; vendor figures not reconciled to a filing in the corpus.')
  if recon: return 'Real (inputs match 10-K/20-F)', base+'Revenue, net income and operating cash flow equal the filing; the extreme ratio comes from a depressed price against a five-year median margin.'
  return 'Real (vendor inputs, not reconciled)', base+'Inputs internally consistent; price history shows a genuine decline or a cash-rich balance sheet; no primary filing in the corpus to reconcile.'
rows=[]
for r in t:
  d,why=decide(r)
  rows.append({**r,'decision':d,'why':why})
json.dump(rows,open(H+'/sweep-decisions.json','w'),indent=1)
from collections import Counter
print(Counter(r['decision'] for r in rows))
print([ (r['id'],r['candBuy']) for r in rows if r['candBuy']])
