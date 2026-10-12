import json,os,sys,collections
R='/Users/miki/data/value-outlier-work/audit'
ids=open(R+'/published-ids.txt').read().split()
rules={'E6 JP capex':'__never__','E1 replenished D&A':'D&A is replenished inside operating cash flow','E3 minority cash':'Material minority interests without a reported profit split','E5 lender cash':'Lending, deposit or settlement funds'}
cnt=collections.Counter(); changed=[]; byrule=collections.defaultdict(list)
for id in ids:
  try: b=json.load(open(f'{R}/analysis-before/{id}.json')); a=json.load(open(f'{R}/corpus/analysis/{id}.json'))
  except Exception as e: cnt['missing']+=1; continue
  vb=b.get('valuation'); va=a.get('valuation')
  mb=vb and vb['perShare']['mid']; ma=va and va['perShare']['mid']
  ta=''.join(a['tests'][k]['result'][0] for k in a['tests'] if k!='price'); tb=''.join(b['tests'][k]['result'][0] for k in b['tests'] if k!='price')
  hits=[k for k,s in rules.items() if va and any(s in x for x in va['assumptions'])]
  if vb and not va and 'insufficient owner earnings' in (a.get('valuationReason') or ''): hits.append('E4 absent capex?')
  if va and vb and va.get('balanceSheet',{}).get('end')!=vb.get('balanceSheet',{}).get('end'): hits.append('E2 balance '+str(vb.get('balanceSheet',{}).get('end'))+'->'+str(va.get('balanceSheet',{}).get('end')))
  same = (mb is None and ma is None) or (mb and ma and abs(ma/mb-1)<1e-9)
  if not same or ta!=tb:
    changed.append((id,mb,ma,tb,ta,hits,(b.get('profitRecord') or {}).get('pass'),(a.get('profitRecord') or {}).get('pass'),a.get('valuationReason')))
    for h in hits or ['other']: byrule[h.split(' ')[0]].append(id)
print('changed',len(changed))
for k,v in byrule.items(): print(k,len(v))
json.dump(changed,open(R+'/evidence/analysis-diff.json','w'))
oth=[c for c in changed if not c[5]]
print('other sample',oth[:15])
