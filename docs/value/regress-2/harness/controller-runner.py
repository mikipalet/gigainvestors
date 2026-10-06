"""Controller-only pause/resume of the idle scheduler. Never open its lock."""
import json,os,signal,sys,time
from pathlib import Path
mode,receipt=sys.argv[1:];receipt=Path(receipt)
def info(pid):
 p=Path('/proc')/str(pid);status=(p/'status').read_text();stat=(p/'stat').read_text().rsplit(')',1)[1].split()
 return {'pid':pid,'parent':int(next(x.split()[1]for x in status.splitlines()if x.startswith('PPid:'))),'comm':(p/'comm').read_text().strip(),'start':stat[19]}
def scheduler(pid):
 try:
  p=Path('/proc')/str(pid);args=(p/'cmdline').read_bytes().split(b'\0')
  return os.path.realpath(p/'cwd')==os.path.realpath('/Users/miki/GitHub/superinvestors-wt/value-daily')and any(a==b'scripts/value/run-daily.sh'or a.endswith(b'/scripts/value/run-daily.sh')for a in args)
 except OSError:return False
def processes():
 out=[]
 for p in Path('/proc').iterdir():
  if p.name.isdigit():
   try:out.append(info(int(p.name)))
   except (OSError,StopIteration):pass
 return out
if mode=='pause':
 assert not receipt.exists(),'Pause receipt already exists; inspect it before retrying'
 procs=processes();roots=[r for r in procs if scheduler(r['pid'])];assert len(roots)==1,'Expected exactly one scheduler'
 root=roots[0];ids={root['pid']}
 while True:
  more={r['pid']for r in procs if r['parent']in ids}
  if more<=ids:break
  ids|=more
 children=[r for r in procs if r['pid']in ids and r['pid']!=root['pid']]
 assert children and all(r['comm']=='sleep'for r in children),'Scheduler is not idle; wait for its current cycle to finish'
 os.kill(root['pid'],signal.SIGSTOP)
 # Refuse a stage-start race, then resume the scheduler unchanged.
 new=processes();desc={root['pid']}
 while True:
  more={r['pid']for r in new if r['parent']in desc}
  if more<=desc:break
  desc|=more
 current=[r for r in new if r['pid']in desc and r['pid']!=root['pid']]
 if any(r['comm']!='sleep'for r in current):
  os.kill(root['pid'],signal.SIGCONT);raise SystemExit('Scheduler started a stage; pause was cancelled')
 for r in current:os.kill(r['pid'],signal.SIGSTOP)
 receipt.parent.mkdir(parents=True,exist_ok=True);receipt.write_text(json.dumps({'root':root,'children':current},indent=2)+'\n')
 print('Idle scheduler and sleep paused; lock untouched')
elif mode=='resume':
 data=json.loads(receipt.read_text());rows=[*data['children'],data['root']]
 for r in rows:assert info(r['pid'])['start']==r['start'],'PID changed; do not signal a replacement process'
 assert scheduler(data['root']['pid']),'Scheduler identity changed'
 for r in rows:os.kill(r['pid'],signal.SIGCONT)
 receipt.rename(receipt.with_suffix('.resumed.json'));print('Existing scheduler resumed; lock untouched')
else:raise SystemExit('Use pause or resume')
