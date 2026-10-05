"""Prepare independent baseline/candidate engines without changing the live method."""
from pathlib import Path
import gzip,hashlib,io,json,shutil,subprocess,tarfile
ROOT=Path(__file__).resolve().parents[2]; WORK=ROOT/'.audit/understandable'
for p in ['/',str(Path.home()/'data')]:
 if shutil.disk_usage(p).free<4*1024**3:raise SystemExit('DISK STOP: commit and stop')
base='ab804f2'
archive=subprocess.check_output(['git','archive',base,'lib'],cwd=ROOT)
for name in ['baseline','candidate']:
 target=WORK/name;target.mkdir(parents=True,exist_ok=True)
 with tarfile.open(fileobj=io.BytesIO(archive)) as t:t.extractall(target,filter='data')
source=ROOT/'research/understandable/candidate.ts'
(WORK/'candidate/lib/value/tests/understandable.ts').write_text(source.read_text().replace('"../../lib/value/','"../'))
(ROOT/'research/understandable/outputs/engine-freeze.json').write_text(json.dumps({'baseline':base,'candidate_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'archive_sha256':hashlib.sha256(archive).hexdigest()},indent=2)+'\n')

# Node cannot decode the original >512 MiB JSON string. Split without changing
# observations so replay can keep only one company's fundamentals in memory.
fund_dir=WORK/'fundamentals';fund_dir.mkdir(exist_ok=True)
source_fund=Path.home()/'data/value-research/inputs/fundamentals.json.gz'
if not (fund_dir/'complete.json').exists():
 with gzip.open(source_fund,'rt') as f:funds=json.load(f)
 for identity,record in funds.items():
  with gzip.open(fund_dir/(identity+'.json.gz'),'wt') as f:json.dump(record,f,separators=(',',':'))
 (fund_dir/'complete.json').write_text(json.dumps({'count':len(funds),'source_sha256':hashlib.file_digest(source_fund.open('rb'),'sha256').hexdigest()})+'\n')

extended=ROOT/'research/understandable/inputs/extended-replay.tar.gz'
if extended.exists():
 with tarfile.open(extended,'r:gz') as t:t.extractall(WORK,filter='data')
