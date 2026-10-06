"""Complete the independent copy with native caches required by ordinary analyze."""
from pathlib import Path
import hashlib,json,shutil,gzip
root=Path(__file__).resolve().parents[3];work=root/'.audit/understand-2';corpus=root/'.audit/understandable/corpus';source=Path.home()/'value-corpus';original=work/'original-analysis'
ids=json.load(open(work/'published-ids.json'));manifest={};missing=[]
def guard():
 for mount in ['/',str(Path.home()/'data')]:
  if shutil.disk_usage(mount).free<4*1024**3:raise SystemExit('DISK STOP')
def copy(p):
 guard();rel=p.relative_to(source);target=corpus/rel;target.parent.mkdir(parents=True,exist_ok=True)
 shutil.copyfile(p,target)
 manifest[str(rel)]={'bytes':target.stat().st_size,'sha256':hashlib.file_digest(target.open('rb'),'sha256').hexdigest()}
for folder in ['raw/sec-annual','raw/annual-reviewed']:
 for p in (source/folder).glob('*.json'):copy(p)
for index,i in enumerate(ids):
 for suffix in ['', 'inputs/', 'fingerprints/']:
  src=original/suffix/(i+'.json');dst=corpus/'analysis'/suffix/(i+'.json')
  if src.exists():shutil.copyfile(src,dst)
 r=source/'reports'/i
 if r.exists():
  shutil.rmtree(corpus/'reports'/i,ignore_errors=True)
  for p in r.rglob('*'):
   if p.is_file():copy(p)
 else:missing.append('reports/'+i)
 j=source/'jev'/(i+'.json')
 if j.exists():copy(j)
 else:
  (corpus/'jev'/(i+'.json')).unlink(missing_ok=True);missing.append('jev/'+i+'.json')
 if index%500==0:print('Native caches',index,'/',len(ids),flush=True)
# Undo the prior manual candidate staging, not any ordinary analyzer output.
for i,a in json.load(gzip.open(root/'research/understandable/inputs/current-analyses.json.gz','rt')).items():
 (corpus/'analysis'/(i+'.json')).write_text(json.dumps(a,separators=(',',':'))+'\n')
receipt={'files':manifest,'missing':missing,'count':len(manifest),'bytes':sum(v['bytes'] for v in manifest.values())}
with gzip.open(root/'research/understandable/outputs/understand-2/native-cache-manifest.json.gz','wt') as f:json.dump(receipt,f,separators=(',',':'))
print(json.dumps({k:v for k,v in receipt.items() if k!='files'}),flush=True)
