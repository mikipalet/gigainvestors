from pathlib import Path
import json,gzip,collections
r=Path('.fix5c/nightly-9');live=Path('/Users/miki/value-corpus/publish-repo')
load=lambda p:json.loads(p.read_text())
def dossiers(root):return {k:v for p in (root/'dossiers').glob('*.json') for k,v in load(p).items()}
a,b=dossiers(live),dossiers(r/'after-final');frozen=set(load(r/'corpus/verdict-freeze.json')['ids'])
with gzip.open(r/'price-expectations.json.gz','rt') as f:expected=json.load(f)
changes=[];blanks=[];quality=[]
public=lambda result:result if result in ['pass','fail'] else None
for id in sorted(a.keys()&b.keys()):
 for test in ['understandable','moat','economics','management','accounting','price']:
  x=a[id]['tests'].get(test,{}).get('result');y=b[id]['tests'].get(test,{}).get('result')
  if x==y:continue
  if test!='price':quality.append({'id':id,'test':test,'before':x,'after':y});continue
  e=expected.get(id,{}).get('priceFields',{});before=e.get('before',{}).get('tests',{}).get('price',{}).get('result');after=e.get('after',{}).get('tests',{}).get('price',{}).get('result')
  quoteOnly=bool(e) and public(before)==x and public(after)==y and public(before)!=public(after)
  changes.append({'id':id,'before':x,'after':y,'quoteOnly':quoteOnly,'quote':expected.get(id,{}).get('quote')})
  if x in ['pass','fail'] and y is None:blanks.append(id)
cap={x['id']:x for x in load(r/'corpus/staging/publication-capitalization.json')}
original=load(Path('.superpowers/sdd/2026-09-29-value/nightly-8-remaining-price-causes.json'))
causes=[]
for x in original:
 id=x['id'];fresh=b[id];held=fresh.get('priceTestFreeze');c=cap.get(id)
 causes.append({**x,'nightly9':fresh['tests'].get('price',{}).get('result'),'resolution':'full company freeze' if id in frozen else 'live price test retained' if held else 'computed from current inputs','inputEvidence':c,'priceTestFreeze':held})
held=[{'id':id,**v['priceTestFreeze'],'inputEvidence':cap.get(id)} for id,v in b.items() if v.get('priceTestFreeze')]
rows={row['id']:row for p in (r/'after-final/index').glob('*.json') if p.name!='default.json' for row in load(p)}
inconsistencies=[id for id,d in b.items() if id in rows and (bool(d.get('b'))!=bool(rows[id].get('b')) or d.get('priceTestFreeze')!=rows[id].get('priceTestFreeze'))]
result={'priceChanges':changes,'quoteOnlyChanges':[x for x in changes if x['quoteOnly']],'unapprovedPriceChanges':[x for x in changes if not x['quoteOnly']],'blankedPriceVerdicts':blanks,'qualityChanges':quality,'priceTestFreezes':held,'priceTestFreezeCount':len(held),'indexDossierInconsistencies':inconsistencies,'original114Resolutions':dict(collections.Counter(x['resolution'] for x in causes)),'original114':causes}
(r/'price-audit.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['original114','priceTestFreezes']},indent=2))
