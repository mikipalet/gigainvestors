"""Controller-only read-only wait. Binds GitHub's Vercel status to the release SHA."""
import json,subprocess,sys,time
sha=sys.argv[1]
assert len(sha)==40 and all(c in '0123456789abcdef' for c in sha)
for _ in range(90):
 data=json.loads(subprocess.check_output(['gh','api',f'repos/mikipalet/gigainvestors/commits/{sha}/status']))
 status=next((s for s in data['statuses'] if s['context']=='Vercel'),None)
 if status and status['state'] in ['failure','error']:raise SystemExit('Vercel rejected this release; runner remains paused')
 if status and status['state']=='success':
  prefix='https://vercel.com/mikipalets-projects/superinvestors/'
  assert status['target_url'].startswith(prefix),'Unexpected deployment project'
  deployment=status['target_url'][len(prefix):].strip('/')
  assert deployment.isalnum(),'Invalid deployment ID'
  if not deployment.startswith('dpl_'):deployment='dpl_'+deployment
  result=json.loads(subprocess.check_output(['vercel','inspect',deployment,'--scope','mikipalets-projects','--json','--wait','--timeout=15m']))
  assert result['id']==deployment and result['readyState']=='READY' and result['target']=='production','Production deployment is not Ready'
  print(json.dumps({'release':sha,'deployment':deployment,'readyState':result['readyState'],'url':result['url']}));break
 time.sleep(10)
else:raise SystemExit('Timed out waiting for the release deployment; runner remains paused')
