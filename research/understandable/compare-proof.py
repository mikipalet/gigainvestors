"""Exact ordinary-publish comparison, including current verdicts and freezes."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[2];W=ROOT/'.audit/understandable';O=ROOT/'research/understandable/outputs'
read=lambda p:json.loads(p.read_text())
base=W/'baseline-store';new=W/'redesigned-store';corpus=W/'corpus'
expected={c['id'] for c in read(O/'current-screen.json')['changes']}
freeze=set(read(corpus/'verdict-freeze.json')['ids'])
changes=[];verdicts=[];frozen_differences=[];oldids=set();newids=set();unrelated=[]
def differences(a,b,p=''):
 if a==b:return []
 if isinstance(a,dict) and isinstance(b,dict):
  return [x for k in sorted(set(a)|set(b)) for x in differences(a.get(k),b.get(k),p+'.'+k if p else k)]
 return [{'field':p,'before':a,'after':b}]
for f in sorted(set(p.name for p in (base/'dossiers').glob('*.json'))|set(p.name for p in (new/'dossiers').glob('*.json'))):
 a=read(base/'dossiers'/f) if (base/'dossiers'/f).exists() else {};b=read(new/'dossiers'/f) if (new/'dossiers'/f).exists() else {}
 oldids.update(a);newids.update(b)
 live=read(corpus/'publish-repo/dossiers'/f) if (corpus/'publish-repo/dossiers'/f).exists() else {}
 for i in sorted(set(a)|set(b)):
  if i in freeze and live.get(i)!=b.get(i):frozen_differences.append(i)
  ds=differences(a.get(i),b.get(i))
  if ds:
   changes.append({'id':i,'fields':ds})
   for d in ds:
    if not d['field'].startswith('tests.understandable.'):unrelated.append({'id':i,**d})
  for k in sorted(set((a.get(i) or {}).get('tests',{}))|set((b.get(i) or {}).get('tests',{}))):
   x=(a.get(i) or {}).get('tests',{}).get(k,{}).get('result');y=(b.get(i) or {}).get('tests',{}).get(k,{}).get('result')
   if x!=y:verdicts.append({'id':i,'test':k,'before':x,'after':y,'reason':b[i]['tests'][k]['reasons']})
def indexes(root):
 return {r['id']:r for p in (root/'index').glob('*.json') for r in read(p)}
a,b=indexes(base),indexes(new);index_changes=[{'id':i,'fields':differences(a.get(i),b.get(i))} for i in sorted(set(a)|set(b)) if a.get(i)!=b.get(i)]
company_verdicts=[{'id':i,'quality_before':a[i]['t']=='PPPPP','quality_after':b[i]['t']=='PPPPP','buy_before':bool(a[i].get('b')),'buy_after':bool(b[i].get('b'))} for i in sorted(set(a)&set(b)) if (a[i]['t']=='PPPPP',bool(a[i].get('b')))!=(b[i]['t']=='PPPPP',bool(b[i].get('b')))]
files=[];protected=[]
for rel in sorted(set(str(p.relative_to(base)) for p in base.rglob('*') if p.is_file())|set(str(p.relative_to(new)) for p in new.rglob('*') if p.is_file())):
 x,y=base/rel,new/rel
 equal=x.exists() and y.exists() and hashlib.file_digest(x.open('rb'),'sha256').digest()==hashlib.file_digest(y.open('rb'),'sha256').digest()
 if not equal:files.append(rel)
 if rel.startswith(('history/','forward/','prices/')) and not equal:protected.append(rel)
result={'before_dossiers':len(oldids),'after_dossiers':len(newids),'changed_dossiers':changes,'changed_verdicts':verdicts,'company_verdicts':company_verdicts,'changed_indexes':index_changes,'changed_files':files,'unrelated_dossier_changes':unrelated,'explicit_frozen_count':len(freeze),'frozen_differences':frozen_differences,'protected_file_changes':protected,'method_version':read(new/'meta.json').get('methodVersion')}
# The ordinary publisher has two existing presentation dependencies: research
# coverage opens judgement notes at 4/5 passes; an explicitly refreshed analysis
# resumes publication instead of preserving the byte-identical coverage baseline.
# Classify exact observed effects, never suppress them from the receipt.
notes={'KOG.OL','FTNT.US','0291.HK','STRL.US','IDT.US'}
thawed={'LRN.US','STRL.US','IDT.US'}
secondary=[];unexpected=[]
for d in unrelated:
 i,k=d['id'],d['field'];reason=None
 if i in notes and (k=='judgement' or k in {'tests.'+t+'.judgement' for t in ['moat','economics','management','accounting']}):
  assert d['before'] is None
  if k!='judgement':assert d['after']['override'] is False
  assert sum(x=='F' for x in a[i]['t'])==2 and sum(x=='F' for x in b[i]['t'])==1
  reason='Existing researchCoverage reveals cached notes at four quality passes'
 elif i in thawed and k in {'methodVersion','ownerMemo.lines','priceStory.asOf','priceStory.line','priceStory.needs','priceStory.priceDate','valuation','valueHistory','tests.price'}:
  reason='Changed analysis resumes ordinary publication from coverage baseline; stored price/valuation data become visible'
 elif i=='NFLX.US' and k=='priceStory.asOf':reason='Ordinary publisher render timestamp only'
 (secondary if reason else unexpected).append({**d,**({'explanation':reason} if reason else {})})
# No fair-value or price model was recalculated by the candidate. The newly
# visible values must be precisely those in the archived original analysis.
import gzip
original=json.load(gzip.open(ROOT/'research/understandable/inputs/current-analyses.json.gz','rt'))
for i in thawed:
 d=next(x for x in changes if x['id']==i)
 v=next(x['after'] for x in d['fields'] if x['field']=='valuation')
 for k in ['version','currency','discountRate','terminalGrowth','bondYield','shares','perShare','perShareTrading']:
  assert v.get(k)==original[i]['valuation'].get(k),(i,k)
assert all(not x['valuationChanged'] for x in read(O/'staged-current.json'))
result['secondary_publisher_changes']=secondary
result['unexpected_changes']=unexpected
result['verification_passed']=not unexpected and not frozen_differences and not protected
(O/'publication-proof.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['changed_dossiers','changed_indexes','changed_files','unrelated_dossier_changes','secondary_publisher_changes']},indent=2))
assert oldids==newids
assert {c['id'] for c in changes}==expected-freeze
assert len([c for c in verdicts if c['test']=='understandable'])==9
assert all((c['test']=='understandable' and c['before']=='fail' and c['after']=='pass') or (c['id'] in {'STRL.US','IDT.US'} and c['test']=='price' and c['before'] is None and c['after']=='fail') for c in verdicts)
assert not unexpected and not frozen_differences and not protected
assert all(not c['buy_before'] and not c['buy_after'] for c in company_verdicts)
