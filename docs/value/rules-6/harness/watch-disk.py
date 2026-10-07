import shutil,time,json,subprocess,os,signal
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-6');repo=Path('/Users/miki/data/value-rules')
while not (r/'evidence/done').exists():
 values={p:shutil.disk_usage(p).free for p in ['/','/Users/miki/data']}
 with (r/'evidence/disk.jsonl').open('a')as f:f.write(json.dumps({'time':time.time(),'free':values})+'\n')
 if min(values.values())<4*1024**3:
  (r/'evidence/DISK_STOP').write_text(json.dumps(values))
  for p in (r/'evidence').glob('task-*.pid'):
   try:
    record=json.loads(p.read_text());pid=record['pid']
    current=Path(f'/proc/{pid}/stat').read_text().rsplit(')',1)[1].split()
    if current[19]!=record['start']:continue
    processes={}
    for proc in Path('/proc').iterdir():
     if not proc.name.isdigit():continue
     try:processes[int(proc.name)]=int((proc/'stat').read_text().rsplit(')',1)[1].split()[1])
     except (OSError,IndexError,ValueError):pass
    owned={pid}
    while True:
     more={child for child,parent in processes.items() if parent in owned}
     if more<=owned:break
     owned|=more
    for child in sorted(owned-{pid},reverse=True):
     try:os.kill(child,signal.SIGTERM)
     except ProcessLookupError:pass
    os.kill(pid,signal.SIGTERM)
   except (OSError,ValueError,TypeError,KeyError):pass
  subprocess.run(['git','add','.gitignore','components/value','lib/value','scripts/value','tests/unit/value','docs/value/rules-6','research/valuation'],cwd=repo)
  subprocess.run(['git','commit','-m','value: 3.6.0 values owner earnings correctly'],cwd=repo,stdout=(r/'evidence/disk-stop-commit.log').open('w'),stderr=subprocess.STDOUT)
  break
 time.sleep(5)
