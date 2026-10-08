"""Hardlink identical immutable raw observations inside the disposable copy only."""
import json,os,time,hashlib
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-7');p=r/'evidence/source-baseline.json'
while not p.exists():
 if (r/'evidence/DISK_STOP').exists():raise SystemExit('DISK STOP')
 time.sleep(2)
a=json.loads(p.read_text());seen={};count=0;saved=0
for rel,h in a.items():
 if not rel.startswith('raw/'):continue
 f=r/'corpus'/rel
 if not f.exists():continue
 key=(h,f.stat().st_size)
 if key not in seen:seen[key]=f;continue
 old=seen[key]
 if old.stat().st_ino==f.stat().st_ino:continue
 # Confirm identity immediately before replacement; no links to live inputs.
 if hashlib.sha256(f.read_bytes()).hexdigest()!=h or hashlib.sha256(old.read_bytes()).hexdigest()!=h:continue
 t=f.with_name(f.name+'.rules7-dedupe');os.link(old,t);os.replace(t,f);count+=1;saved+=key[1]
(r/'evidence/raw-deduplication.json').write_text(json.dumps({'files':count,'bytesSaved':saved,'linksToLive':False},indent=2)+'\n')
print(count,saved,flush=True)
