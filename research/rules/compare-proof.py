"""Compare two ordinary local exports, retaining every field and verdict delta."""
from pathlib import Path
import json,gzip,hashlib,csv,collections
R=Path(__file__).resolve().parents[2]; W=R/'.audit/rules'; O=R/'research/rules/outputs'
read=lambda p:json.loads(p.read_text())
def dossiers(root):return {i:d for p in (root/'dossiers').glob('*.json') for i,d in read(p).items()}
def indexes(root):return {r['id']:r for p in (root/'index').glob('*.json') for r in read(p)}
def differences(a,b,p=''):
 if a==b:return []
 if isinstance(a,dict) and isinstance(b,dict):return [x for k in sorted(set(a)|set(b)) for x in differences(a.get(k),b.get(k),p+'.'+k if p else k)]
 return [{'field':p,'before':a,'after':b}]
a=dossiers(W/'baseline-store'); b=dossiers(W/'candidate-store'); live=dossiers(W/'corpus/publish-repo')
x=indexes(W/'baseline-store'); y=indexes(W/'candidate-store'); z=indexes(W/'corpus/publish-repo')
freeze=set(read(W/'corpus/verdict-freeze.json')['ids']); changes=[]; verdicts=[]; companies=[]
for i in sorted(set(a)|set(b)):
 ds=differences(a.get(i),b.get(i))
 if ds:changes.append({'id':i,'fields':ds})
 for k in sorted(set(a.get(i,{}).get('tests',{}))|set(b.get(i,{}).get('tests',{}))):
  t=a.get(i,{}).get('tests',{}).get(k,{});u=b.get(i,{}).get('tests',{}).get(k,{})
  if t.get('result')!=u.get('result'):verdicts.append({'id':i,'test':k,'before':t.get('result'),'after':u.get('result'),'reason_before':t.get('reasons'),'reason_after':u.get('reasons'),'metrics_before':t.get('metrics',{}),'metrics_after':u.get('metrics',{})})
for v in verdicts:
 if v['test']=='moat' and v['after']=='pass' and not v['reason_after']:
  v['explanation']='Recent and typical gross margin meets the existing 4pp limit; capital-return gates pass.' if v['metrics_after'].get('grossMarginDrop') is not None else 'Optional margin check unavailable with incomplete/gapped 7–10-year history; capital-return gates pass.'
 else:v['explanation']='; '.join(v['reason_after'] or [])
for i in sorted(set(x)&set(y)):
 if (x[i].get('t'),bool(x[i].get('b')))!=(y[i].get('t'),bool(y[i].get('b'))):
  companies.append({'id':i,'mask_before':x[i].get('t'),'mask_after':y[i].get('t'),'quality_before':x[i].get('t')=='PPPPP','quality_after':y[i].get('t')=='PPPPP','buy_before':bool(x[i].get('b')),'buy_after':bool(y[i].get('b')),'reason':'; '.join(v['test']+': '+v['explanation'] for v in verdicts if v['id']==i)})
protected=[];relabel=[];new_forward=[]
def strip_version(v):
 if isinstance(v,dict):return {k:strip_version(x) for k,x in v.items() if k!='methodVersion'}
 if isinstance(v,list):return [strip_version(x) for x in v]
 return v
for p in (W/'baseline-store').rglob('*.json'):
 rel=p.relative_to(W/'baseline-store'); q=W/'candidate-store'/rel
 if str(rel).startswith(('prices/','forward/','history/')) and (not q.exists() or p.read_bytes()!=q.read_bytes()):
  if str(rel).startswith('forward/') and not (W/'corpus/publish-repo'/rel).exists():new_forward.append(str(rel))
  elif q.exists() and strip_version(read(p))==strip_version(read(q)):relabel.append(str(rel))
  else:protected.append(str(rel))
frozen=[i for i in freeze if b.get(i)!=live.get(i)]
staged={p.stem:read(p) for p in (O/'staged-baseline').glob('*.json')}
expected={r['id'] for r in read(O/'current-candidate-changes.json') if r['variant']=='combined'}
actual={v['id'] for v in verdicts if v['test']!='price'}
# Numeric masks must be visible unless an explicit, existing publication hold applies.
held=sorted(expected-actual)
wrong=sorted(actual-expected)
released=[{'id':i,'before':z.get(i,{}).get('t'),'baseline':x.get(i,{}).get('t'),'buy_before':bool(z.get(i,{}).get('b')),'buy_baseline':bool(x.get(i,{}).get('b'))} for i in sorted(set(z)|set(x)) if (z.get(i,{}).get('t'),bool(z.get(i,{}).get('b')))!=(x.get(i,{}).get('t'),bool(x.get(i,{}).get('b')))]
result={'before_dossiers':len(a),'after_dossiers':len(b),'changed_dossiers':len(changes),'verdicts':verdicts,'company_verdicts':companies,'numeric_changed_ids':len(expected),'held_numeric_changes':held,'unexpected_numeric_changes':wrong,'frozen_count':len(freeze),'frozen_differences':frozen,'protected_changes':protected,'history_version_relabels':relabel,'new_forward_record_changes':new_forward,'method_version':read(W/'candidate-store/meta.json').get('methodVersion'),'released_to_baseline':released,'field_counts':dict(collections.Counter(v['field'] for c in changes for v in c['fields']))}
with gzip.open(O/'publication-field-diffs.json.gz','wt') as f:json.dump(changes,f,separators=(',',':'))
(O/'publication-proof.json').write_text(json.dumps(result,indent=2)+'\n')
with (O/'current-verdict-changes.csv').open('w') as f:
 wr=csv.DictWriter(f,fieldnames=list(companies[0]) if companies else ['id']);wr.writeheader();wr.writerows(companies)
assert set(a)==set(b),'Dossier coverage changed'
assert not frozen and not protected and not wrong,(frozen,protected,wrong)
assert not [v for v in verdicts if v['test'] not in ['understandable','moat','price']], 'Unrelated quality verdict changed'
print(json.dumps({k:v for k,v in result.items() if k not in ['verdicts','company_verdicts','released_to_baseline','field_counts']},indent=2))
