"""Independent local-publication input copy; no hardlinks, credentials or runner locks."""
from pathlib import Path
import gzip,hashlib,json,shutil,time
ROOT=Path(__file__).resolve().parents[2];DEST=ROOT/'.audit/understandable/corpus';SOURCE=Path.home()/'value-corpus'
manifest={}
def guard():
 for p in ['/',str(Path.home()/'data')]:
  if shutil.disk_usage(p).free<4*1024**3:raise SystemExit('DISK STOP: commit and stop')
def copy(p):
 guard();rel=p.relative_to(SOURCE);dest=DEST/rel
 # Source aliases are read-only inputs. Dereference to an independent regular
 # destination file; never reproduce a link into the original evidence cache.
 if dest.is_symlink():raise RuntimeError('Destination must be independent: '+str(rel))
 dest.parent.mkdir(parents=True,exist_ok=True)
 if not dest.exists() or dest.stat().st_size!=p.stat().st_size:
  shutil.copyfile(p,dest)
 manifest[str(rel)]={'size':dest.stat().st_size,'sha256':hashlib.file_digest(dest.open('rb'),'sha256').hexdigest()}
 if len(manifest)%1000==0:print('copied',len(manifest),flush=True)
# Whitelist only data consumed by ordinary offline publication and exact numeric replay.
for rel in ['analysis','fundamentals','companies','completeness','raw/eodhd','publish-repo','index-membership','held-membership','flags','price-story','business-fit','published-memos','enrichment-v7','thesis','judgement','history-v7','history-return-prices','prices','prices-history','prices-history-long','bonds']:
 p=SOURCE/rel
 if not p.exists():continue
 for f in p.rglob('*'):
  if '.git' in f.parts or f.name.startswith('.env'):continue
  if f.is_file():copy(f)
for rel in ['universe.jsonl','bonds.json','verdict-freeze.json','logo-overrides.json']:
 p=SOURCE/rel
 if p.exists():copy(p)
for p in (SOURCE/'reports').glob('*/meta.json'):copy(p)
(DEST/'staging').mkdir(exist_ok=True)
p=ROOT/'research/understandable/outputs/corpus-copy-manifest.json'
payload={'copied_at':time.time(),'source':str(SOURCE),'files':manifest}
b=(json.dumps(payload,indent=2)+'\n').encode()
with gzip.open(str(p)+'.gz','wb') as f:f.write(b)
p.write_text(json.dumps({'copied_at':payload['copied_at'],'source':str(SOURCE),'files':len(manifest),'copied_bytes':sum(x['size'] for x in manifest.values()),'manifest_archive':p.name+'.gz','uncompressed_sha256':hashlib.sha256(b).hexdigest()},indent=2)+'\n')
print('DONE',len(manifest),flush=True)
