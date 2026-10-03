import os,pathlib,subprocess,time,json,sys
root=pathlib.Path(__file__).resolve().parent
stage=sys.argv[1];args=sys.argv[2:];label=os.environ.get("NIGHTLY_RUN_LABEL",stage)
# A missing frozen-source link silently looks like an absent optional cache.
# Reject it before replay instead of producing an incomplete comparison.
broken=[]
for parent,dirs,files in os.walk(root/'corpus',followlinks=False):
 for name in dirs+files:
  pth=pathlib.Path(parent)/name
  if pth.is_symlink() and not pth.exists():broken.append(str(pth.relative_to(root/'corpus')))
if broken:
 (root/'source-link-preflight.json').write_text(json.dumps({'broken':broken},indent=2)+'\n')
 raise SystemExit('Replay aborted: broken source-cache links; see source-link-preflight.json')
(root/'source-link-preflight.json').write_text(json.dumps({'broken':[]})+'\n')
def private_bytes():
 total=0
 for parent,dirs,files in os.walk(root):
  total+=os.lstat(parent).st_blocks*512
  dirs[:]=[d for d in dirs if not os.path.islink(os.path.join(parent,d))]
  for f in files:
   p=os.path.join(parent,f)
   if os.path.islink(p):continue
   try:st=os.stat(p)
   except FileNotFoundError:continue
   if st.st_nlink==1:total+=st.st_blocks*512
 return total
with open(root/(label+'.log'),'a') as log:
 env={**os.environ,'TSX_DISABLE_CACHE':'1','VALUE_ANALYZE_CONCURRENCY':'6','VALUE_NO_EODHD':'1','NODE_OPTIONS':'--max-old-space-size=1536'}
 started=time.time()
 p=subprocess.Popen(['node','--require',str(root/'guard.cjs'),'--import','tsx','scripts/value/cli.ts',stage,*args],stdout=log,stderr=log,env=env,start_new_session=True)
 peak=0;stop=None;st=os.statvfs(root);free=st.f_bavail*st.f_frsize
 while p.poll() is None:
  st=os.statvfs(root);free=st.f_bavail*st.f_frsize;size=private_bytes();peak=max(peak,size);(root/(label+'-progress.json')).write_text(json.dumps({'pid':p.pid,'stage':stage,'privateBytes':size,'freeBytes':free,'at':time.time()}))
  if free<4*1024**3:
   stop='DISK/BUDGET STOP';os.killpg(p.pid,15);p.wait();break
  time.sleep(3)
 result={'startedAt':started,'finishedAt':time.time(),'stage':stage,'args':args,'exit':p.wait(),'peakPrivateBytes':peak,'freeBytes':free,'stop':stop}
 (root/(label+'-result.json')).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({**result,"args":[f"--only={len(a[7:].split(chr(44)))} companies" if a.startswith("--only=") else a for a in args]}))

if result["exit"] or result["stop"]:raise SystemExit(result["exit"] if result["exit"]>0 else 1)
