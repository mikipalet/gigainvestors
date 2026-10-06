import shutil,time,json,os,signal
from pathlib import Path
root=Path.home()/'data/jev-3'
while not (root/'evidence/done').exists():
 values={p:shutil.disk_usage(p).free for p in ['/',str(Path.home()/'data')]}
 with (root/'evidence/disk.jsonl').open('a') as f:f.write(json.dumps({'time':time.time(),'free':values})+'\n')
 if min(values.values()) < 4*1024**3:
  (root/'evidence/DISK_STOP').write_text(json.dumps(values))
  for p in (root/'evidence').glob('*.pid'):
   try:os.kill(int(p.read_text()),signal.SIGTERM)
   except ProcessLookupError:pass
  break
 time.sleep(5)
