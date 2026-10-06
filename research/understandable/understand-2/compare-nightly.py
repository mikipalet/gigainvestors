"""Enumerate all published verdict changes; no expected-effect suppression."""
from pathlib import Path
import json,hashlib,gzip
root=Path(__file__).resolve().parents[3];work=root/'.audit/understand-2';out=root/'research/understandable/outputs/understand-2'
expected={x['id'] for x in json.load(open(root/'research/understandable/outputs/current-screen.json'))['changes']}
def dossiers(p):return {i:d for f in (p/'dossiers').glob('*.json') for i,d in json.load(open(f)).items()}
def indexes(p):return {f.name:json.load(open(f)) for f in (p/'index').glob('*.json')}
def diff(a,b,p=''):
 if a==b:return []
 if isinstance(a,dict) and isinstance(b,dict):return [x for k in sorted(a.keys()|b.keys()) for x in diff(a.get(k),b.get(k),p+'.'+k if p else k)]
 return [{'field':p,'before':a,'after':b}]
def compare(base,new,name):
 a,b=dossiers(base),dossiers(new);changes=[];verdicts=[];buys=[]
 for i in sorted(a.keys()|b.keys()):
  ds=diff(a.get(i),b.get(i))
  if ds:changes.append({'id':i,'fields':ds})
  for k in ['understandable','moat','economics','management','accounting','price']:
   x=a.get(i,{}).get('tests',{}).get(k,{}).get('result');y=b.get(i,{}).get('tests',{}).get(k,{}).get('result')
   if x!=y:verdicts.append({'id':i,'test':k,'before':x,'after':y})
 ix,iy=indexes(base),indexes(new)
 for filename in sorted(ix.keys()|iy.keys()):
  x={r['id']:bool(r.get('b')) for r in ix.get(filename,[])};y={r['id']:bool(r.get('b')) for r in iy.get(filename,[])}
  for i in sorted(x.keys()|y.keys()):
   if x.get(i)!=y.get(i):buys.append({'index':filename,'id':i,'before':x.get(i),'after':y.get(i)})
 protected=[]
 for directory in ['history','forward','prices']:
  for rel in sorted({str(p.relative_to(base)) for p in (base/directory).rglob('*') if p.is_file()}|{str(p.relative_to(new)) for p in (new/directory).rglob('*') if p.is_file()}):
   x,y=base/rel,new/rel
   if not x.exists() or not y.exists() or hashlib.file_digest(x.open('rb'),'sha256').digest()!=hashlib.file_digest(y.open('rb'),'sha256').digest():protected.append(rel)
 actual={v['id'] for v in verdicts if v['test']=='understandable'}
 unexpected=[v for v in verdicts if not (v['id'] in expected and v['test']=='understandable' and v['before']=='fail' and v['after']=='pass') and not(v['id'] in {'STRL.US','IDT.US'} and v['test']=='price' and v['before'] is None and v['after']=='fail')]
 summary={'comparison':name,'beforeDossiers':len(a),'afterDossiers':len(b),'addedIds':sorted(b.keys()-a.keys()),'removedIds':sorted(a.keys()-b.keys()),'changedDossiers':len(changes),'verdictChanges':verdicts,'unexpectedVerdictChanges':unexpected,'missingExpectedIds':sorted(expected-actual),'buyChanges':buys,'protectedFileChanges':protected,'methodVersion':json.load(open(new/'meta.json'))['methodVersion'],'expectedVerdictsOnly':not unexpected and actual==expected and not buys and a.keys()==b.keys()}
 (out/(name+'.json')).write_text(json.dumps(summary,indent=2)+'\n')
 with gzip.open(out/(name+'-fields.json.gz'),'wt') as f:json.dump(changes,f,separators=(',',':'))
 print(name,json.dumps({k:v for k,v in summary.items() if k not in ['verdictChanges','unexpectedVerdictChanges','buyChanges','protectedFileChanges']},separators=(',',':')),'verdict changes',len(verdicts),'unexpected',len(unexpected),'buys',len(buys),flush=True)
 return summary
compare(root/'.audit/understandable/corpus/publish-repo',work/'master-store','released-to-nightly-master')
compare(work/'master-store',work/'candidate-store','nightly-master-to-candidate')
compare(root/'.audit/understandable/corpus/publish-repo',work/'candidate-store','released-to-nightly-candidate')
