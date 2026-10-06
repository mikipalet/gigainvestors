import shutil,time,json,subprocess,os,signal
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-2');repo=Path('/Users/miki/data/value-rules')
while not (r/'evidence/done').exists():
 values={p:shutil.disk_usage(p).free for p in ['/','/Users/miki/data']}
 with (r/'evidence/disk.jsonl').open('a')as f:f.write(json.dumps({'time':time.time(),'free':values})+'\n')
 if min(values.values())<4*1024**3:
  (r/'evidence/DISK_STOP').write_text(json.dumps(values))
  for p in (r/'evidence').glob('task-*.pid'):
   try:os.kill(int(p.read_text()),signal.SIGTERM)
   except ProcessLookupError:pass
  subprocess.run(['git','add','lib/value','scripts/value','tests/unit/value','docs/value/rules-2'],cwd=repo)
  subprocess.run(['git','commit','-m','value: 3.5.0 judges the record, not one bad year'],cwd=repo,stdout=(r/'evidence/disk-stop-commit.log').open('w'),stderr=subprocess.STDOUT)
  break
 time.sleep(5)
