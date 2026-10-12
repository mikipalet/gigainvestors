"""currency-1: every published analysis before (live 3.8.1 corpus copy) and after (3.8.2 re-analysis),
with the statement-currency cause of each change. Usage: python3 -I diff-analyses.py"""
import json,collections
R='/Users/miki/data/value-currency-work/audit'
ids=open(R+'/published-ids.txt').read().split()
def memo1(a):
  return next((l.get('answer') for l in ((a.get('ownerMemo') or {}).get('lines') or []) if l.get('question')==1),None)
cnt=collections.Counter(); changed=[]
for id in ids:
  try: b=json.load(open(f'{R}/analysis-before/{id}.json')); a=json.load(open(f'{R}/corpus/analysis/{id}.json'))
  except Exception: cnt['missing']+=1; continue
  vb=b.get('valuation'); va=a.get('valuation')
  mb=vb and vb['perShare']['mid']; ma=va and va['perShare']['mid']
  ta=''.join(a['tests'][k]['result'][0] for k in a['tests'] if k!='price'); tb=''.join(b['tests'][k]['result'][0] for k in b['tests'] if k!='price')
  notes=[e['note'] for e in a.get('events') or [] if e['kind']=='currency_change' and e['note'].startswith('Statement currency changed')]
  bal=[x for x in (va or {}).get('assumptions',[]) if 'scale; not used' in x]
  same=(mb is None and ma is None) or (mb and ma and abs(ma/mb-1)<1e-9)
  cur=(b.get('reportingCurrency'),a.get('reportingCurrency'))
  hb,ha=(b.get('historyCoverage') or {}).get('years'),(a.get('historyCoverage') or {}).get('years')
  if not same or ta!=tb or cur[0]!=cur[1] or notes or hb!=ha or memo1(a)!=memo1(b) or (vb or {}).get('balanceSheet',{}).get('end')!=(va or {}).get('balanceSheet',{}).get('end'):
    changed.append({'id':id,'currency':cur,'mid':[mb,ma],'valuationCurrency':[(vb or {}).get('currency'),(va or {}).get('currency')],'tests':[tb,ta],'status':[b.get('status'),a.get('status')],
      'historyYears':[hb,ha],'balanceEnd':[(vb or {}).get('balanceSheet',{}).get('end'),(va or {}).get('balanceSheet',{}).get('end')],
      'memo1':[memo1(b),memo1(a)],'currencyNotes':notes,'valuationReason':a.get('valuationReason')})
json.dump(changed,open(R+'/evidence/analysis-diff.json','w'),indent=1)
cause=collections.Counter('currency' if c['currencyNotes'] or c['currency'][0]!=c['currency'][1] else 'other' for c in changed)
print('changed',len(changed),dict(cause),dict(cnt))
for c in changed:
  if c['currencyNotes'] or c['currency'][0]!=c['currency'][1] or c['balanceEnd'][0]!=c['balanceEnd'][1]:
    print(c['id'],c['currency'],c['mid'],c['tests'],c['status'],c['historyYears'],c['balanceEnd'],c['memo1'][1])
