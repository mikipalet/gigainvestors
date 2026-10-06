from pathlib import Path
import hashlib,json,shutil,gzip
root=Path(__file__).resolve().parents[3];source=Path.home()/'value-corpus';dest=root/'.audit/understandable/corpus';manifest={}
for rel in ['raw/sec-companyfacts','raw/edinet/issuers','raw/esef/shares','raw/market-caps']:
 for p in (source/rel).glob('*.json'):
  for mount in ['/',str(Path.home()/'data')]:
   if shutil.disk_usage(mount).free<4*1024**3:raise SystemExit('DISK STOP')
  target=dest/p.relative_to(source);target.parent.mkdir(parents=True,exist_ok=True)
  assert not target.exists(),target
  shutil.copyfile(p,target)
  manifest[str(p.relative_to(source))]={'bytes':target.stat().st_size,'sha256':hashlib.file_digest(target.open('rb'),'sha256').hexdigest()}
 print(rel,'copied',flush=True)
with gzip.open(root/'research/understandable/outputs/understand-2/nightly-extra-inputs.json.gz','wt') as f:json.dump(manifest,f,separators=(',',':'))
print('files',len(manifest),'bytes',sum(v['bytes'] for v in manifest.values()))
