import pathlib,json,gzip,subprocess,os,time,shutil
r=pathlib.Path('.fix5c/nightly-5');load=lambda p:json.loads(p.read_text())
def run(stage,*args,label=None):
 label=label or stage
 subprocess.run(['python3',str(r/'run.py'),stage,*args],env={**os.environ,'NIGHTLY_RUN_LABEL':label},check=True)
 result=load(r/(label+'-result.json'));assert result['exit']==0 and result['stop'] is None,result
while not all((r/f'analyze-part-{i}-result.json').exists() for i in range(1,5)):
 st=os.statvfs(r)
 if st.f_bavail*st.f_frsize<4*1024**3:raise SystemExit('DISK STOP')
 time.sleep(3)
results=[load(r/f'analyze-part-{i}-result.json') for i in range(1,5)]
assert all(x['exit']==0 and x['stop'] is None for x in results)
p=load(r/'replay-partitions.json');ids=p['completeCheckpoint']+sum(p['partitions'],[]);assert len(ids)==len(set(ids))==p['allJobs']==38056
with gzip.open(r/'replay-partitions.json.gz','wt') as f:json.dump(p,f,separators=(',',':'))
(r/'analyze-full-result.json').write_text(json.dumps({'stage':'checkpoint plus disjoint complete replay','exit':0,'jobs':len(ids),'checkpoint':len(p['completeCheckpoint']),'partitions':[len(x) for x in p['partitions']],'partExitCodes':[x['exit'] for x in results]},indent=2)+'\n')
run('analyze','--only='+','.join(p['forcedFinalTargets']),label='analyze-final-targets')
(r/'analyze.log').write_text('Valid complete replay: 12,034 completed checkpoint jobs + 26,022 disjoint resumed jobs.\n'+''.join((r/f'analyze-part-{i}.log').read_text() for i in range(1,5))+(r/'analyze-final-targets.log').read_text())
subprocess.run(['python3',str(r/'coverage.py')],check=True)
run('business-backfill','--offline')
run('publish','--out='+str(r/'after-final'))
old=pathlib.Path('.fix5c/nightly-4/after-final-3')
if old.exists():shutil.rmtree(old)
with (r/'attribution.log').open('w')as log:
 subprocess.run(['node','--import','tsx','scripts/value/attribute-nightly-verdicts.ts','--before='+str(r/'live-baseline'),'--after='+str(r/'after-final'),'--corpus='+str(r/'corpus'),'--prior=/Users/miki/value-corpus','--original=.superpowers/sdd/2026-09-29-value/nightly-3-quality-flips.json','--rules=.fix5c/nightly-4/rules','--out='+str(r/'final')],env={**os.environ,'TSX_DISABLE_CACHE':'1'},stdout=log,stderr=log,check=True)
with (r/'exact.log').open('w')as log:
 result=subprocess.run(['python3','scripts/value/nightly-exact-diff.py',str(r/'live-baseline'),str(r/'after-final'),str(r/'exact'),'.fix5c/nightly-4/price-expectations.json.gz'],stdout=log,stderr=log)
 assert result.returncode in [0,1]
with(r/'source-summary.json').open('w')as log:
 subprocess.run(['node','--import','tsx',str(r/'check-sources.ts'),'--sources=/Users/miki/value-corpus','--corpus='+str(r/'corpus'),'--attribution='+str(r/'final-attribution.json.gz'),'--out='+str(r/'source-checks.json.gz')],env={**os.environ,'TSX_DISABLE_CACHE':'1'},stdout=log,check=True)
print('Replay, attribution, source comparisons and exact diff complete.',flush=True)
