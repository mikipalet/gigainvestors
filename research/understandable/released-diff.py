"""Enumerate exact released-to-final effects, separately from paired rule proof."""
from pathlib import Path
import json,collections
R=Path(__file__).resolve().parents[2];W=R/'.audit/understandable';O=R/'research/understandable/outputs'
def read(p):return json.loads(p.read_text())
def dossiers(p):return {i:d for f in (p/'dossiers').glob('*.json') for i,d in read(f).items()}
def diff(a,b,p=''):
 if a==b:return []
 if isinstance(a,dict) and isinstance(b,dict):return [v for k in sorted(set(a)|set(b)) for v in diff(a.get(k),b.get(k),p+'.'+k if p else k)]
 return [{'field':p,'before':a,'after':b}]
a=dossiers(W/'corpus/publish-repo');b=dossiers(W/'redesigned-store');base=dossiers(W/'baseline-store')
changes=[{'id':i,'fields':diff(a.get(i),b.get(i))} for i in sorted(set(a)|set(b)) if a.get(i)!=b.get(i)]
verdicts=[{'id':i,'test':k,'before':a[i]['tests'].get(k,{}).get('result'),'after':b[i]['tests'].get(k,{}).get('result')} for i in sorted(set(a)&set(b)) for k in set(a[i]['tests'])|set(b[i]['tests']) if a[i]['tests'].get(k,{}).get('result')!=b[i]['tests'].get(k,{}).get('result')]
result={'changed_dossier_count':len(changes),'changes':changes,'verdicts':verdicts,'field_counts':dict(collections.Counter(x['field'] for c in changes for x in c['fields'])),'baseline_preparation_changes':[{'id':i,'fields':diff(a.get(i),base.get(i))} for i in sorted(set(a)|set(base)) if a.get(i)!=base.get(i)]}
(O/'released-to-final.json').write_text(json.dumps(result,indent=2)+'\n')
expected={c['id'] for c in read(O/'current-screen.json')['changes']}
assert {v['id'] for v in verdicts}==expected
assert all((v['test']=='understandable' and v['before']=='fail' and v['after']=='pass') or (v['id'] in {'STRL.US','IDT.US'} and v['test']=='price' and v['before'] is None and v['after']=='fail') for v in verdicts)
print(json.dumps({'dossiers':len(changes),'verdicts':verdicts,'field_counts':result['field_counts']},indent=2))
