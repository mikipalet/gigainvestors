"""Classify only mechanically proved/explicitly approved changes. Everything
else remains visible for controller review; vendor-only evidence is not a
primary-source approval and no residual is silently frozen away.
"""
import json,re,collections,datetime
from pathlib import Path
root=Path.home()/'data/regress';c=root/'corpus';e=root/'evidence'
def read(p):
 try:return json.loads(p.read_text())
 except FileNotFoundError:return None
s=read(e/'candidate-summary.json');tests=read(e/'candidate-test-changes.json');nulls=read(e/'candidate-numeric-nulls.json');vals=read(e/'candidate-valuation-nulls.json')
approved_understand=set('0291.HK 1209.HK 601898.SHG FTNT.US IDT.US KOG.OL LRN.US NFLX.US STRL.US'.split())
records=[]
for r in tests:
 for test,change in r['tests'].items():
  approved=r['id']in approved_understand and test=='understandable'and change==['fail','pass']
  records.append({'kind':'quality-test','id':r['id'],'test':test,'change':change,'classification':'owner-approved'if approved else 'controller-review','explanation':'Owner-approved understand 3.4.0 transition'if approved else 'See exact metric, source-input and reason changes in changed-input-evidence.json','reasons':r['reasons'].get(test)})
for r in nulls:
 id=r['id'];entry={'kind':'numeric-null',**r,'classification':'controller-review'}
 match=re.fullmatch(r'series.bookValuePerShare\[(\d+)\]',r['path'])
 if match:
  inputs=read(c/f'analysis/inputs/{id}.json')or{};year=next((y for y in inputs.get('memoYears',[])if y['fy']==int(match[1])),None)
  facts=read(c/f'raw/sec-companyfacts/{id}.json')or{}
  if year and isinstance(year.get('equity'),(int,float))and year['equity']<=0:
   observations=[f for f in facts.get('facts',{}).get('us-gaap',{}).get('StockholdersEquity',{}).get('units',{}).get(year['currency'],[])if f.get('end')==year['end']and not f.get('start')and f.get('val')==year['equity']and f.get('form')in ['10-K','20-F','40-F']and f.get('filed','9999')<='2026-10-06']
   if observations:
    f=sorted(observations,key=lambda f:f.get('filed',''))[-1]
    entry.update(classification='primary-source-explained',explanation='Filed nonpositive equity makes book value per share unavailable under the existing positive-equity definition.',equity=year['equity'],period=year['end'],concept='us-gaap:StockholdersEquity',unit=year['currency'],fact=f,source=f'https://data.sec.gov/api/xbrl/companyfacts/CIK{str(facts.get("cik","")).zfill(10)}.json')
 match=re.fullmatch(r'tests.management.series.marketCap\[(\d+)\]',r['path'])
 if match:
  inputs=read(c/f'analysis/inputs/{id}.json')or{};year=next((y for y in inputs.get('memoYears',[])if y['fy']==int(match[1])),None)
  if year and int(year['end'][8:10])<=7:
   day=datetime.date.fromisoformat(year['end']);month=(day.replace(day=1)-datetime.timedelta(days=1)).isoformat()[:7]
   history=read(c/f'prices-history/{id}.json')or[];history=history if isinstance(history,list)else history.get('prices',[])
   facts=read(c/f'raw/sec-companyfacts/{id}.json')or{}
   observations=[f for f in facts.get('facts',{}).get('us-gaap',{}).get('NetIncomeLoss',{}).get('units',{}).get(year['currency'],[])if f.get('end')==year['end']and f.get('start')and 330<=(datetime.date.fromisoformat(f['end'])-datetime.date.fromisoformat(f['start'])).days<=400 and f.get('val')==year.get('netIncome')and f.get('form')in ['10-K','20-F','40-F']and f.get('filed','9999')<='2026-10-06']
   if observations and not any(row[0]==month for row in history):
    entry.update(classification='primary-source-explained',explanation='The filed fiscal end falls in the first week. The calibrated fiscal-date rule requires the preceding month-end close, which is absent from cached history; the old later-month close was not valid for that date.',period=year['end'],missingPriceMonth=month,fact=sorted(observations,key=lambda f:f.get('filed',''))[-1],source=f'https://data.sec.gov/api/xbrl/companyfacts/CIK{str(facts.get("cik","")).zfill(10)}.json')
 records.append(entry)
for r in vals:records.append({'kind':'valuation-null','id':r['id'],'reason':r.get('reason'),'classification':'controller-review','evidence':'balance-trace.json contains selected dates, missing fields and available same-quarter primary observations'})
approvals={r['id']:r for r in read(Path('scripts/value/approved-verdict-changes.json'))}
for r in s['buyChanges']:
 a=approvals.get(r['id']);state=lambda x:{k:x.get(k)for k in ['b','v','m']}
 exact=bool(a and state(r['before'])==a['before']and state(r['after'])==a['after']and r['before'].get('t')==r['after'].get('t'))
 records.append({'kind':'buy',**r,'classification':'owner-approved'if exact else 'controller-review','explanation':'Exact existing approval manifest match'if exact else 'No exact existing approval matches this emitted transition'})
summary={'counts':dict(collections.Counter(r['classification']for r in records)),'residualByKind':dict(collections.Counter(r['kind']for r in records if r['classification']=='controller-review')),'residualIds':sorted({r['id']for r in records if r['classification']=='controller-review'}),'approvedIds':sorted({r['id']for r in records if r['classification']=='owner-approved'}),'primaryExplainedNumericNulls':sum(r['kind']=='numeric-null'and r['classification']=='primary-source-explained'for r in records)}
(e/'audit-classifications.json').write_text(json.dumps(records,indent=2)+'\n');(e/'residual-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
