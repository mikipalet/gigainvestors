import os,signal,subprocess,sys,time,json
from pathlib import Path
p=subprocess.Popen(sys.argv[1:],start_new_session=True)
minimum=10**20
while p.poll() is None:
 s=os.statvfs('.');free=s.f_bavail*s.f_frsize;minimum=min(minimum,free)
 if free<4*1024**3:
  os.killpg(p.pid,signal.SIGTERM)
  Path('.story-pub-1/DISK-STOP.txt').write_text(f'Stopped below 4 GiB: {free}\n')
  subprocess.run(['git','add','-u'],check=True)
  subprocess.run(['git','commit','-m','value: price story on live base'],check=True)
  sys.exit(99)
 time.sleep(2)
print('DISK_GUARD',json.dumps({'minimumFreeBytes':minimum,'exit':p.returncode}),flush=True)
sys.exit(p.returncode)
