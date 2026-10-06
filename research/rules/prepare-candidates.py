from pathlib import Path
import datetime,hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[2];HERE=ROOT/'research/rules';WORK=ROOT/'.audit/rules'
if any(shutil.disk_usage(p).free<4*1024**3 for p in ['/',Path.home()/'data']):raise SystemExit('DISK STOP')
seal={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sources':{n:hashlib.sha256((HERE/n).read_bytes()).hexdigest() for n in ['candidate-understandable.ts','candidate-moat.ts','protocol.json']}}
f=HERE/'implementation-freeze.json'
if f.exists() and json.loads(f.read_text())['sources']!=seal['sources']:raise RuntimeError('Frozen implementation changed')
if not f.exists():f.write_text(json.dumps(seal,indent=2)+'\n')
for variant,keys in [('recovered_dip',['understandable']),('recent_typical_margin',['moat']),('combined',['understandable','moat'])]:
 shutil.copytree(WORK/'baseline/lib',WORK/variant/'lib',dirs_exist_ok=True)
 for key in keys:
  source=(HERE/f'candidate-{key}.ts').read_text().replace('"../../lib/value/','"../')
  (WORK/variant/f'lib/value/tests/{key}.ts').write_text(source)
print('Prepared frozen candidate engines')
