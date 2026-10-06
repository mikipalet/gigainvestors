from pathlib import Path
import gzip,hashlib,io,json,shutil,subprocess,tarfile
ROOT=Path(__file__).resolve().parents[2]; WORK=ROOT/'.audit/rules'
for p in ['/',str(Path.home()/'data')]:
 if shutil.disk_usage(p).free<4*1024**3:raise SystemExit('DISK STOP: commit and stop')
archive=subprocess.check_output(['git','archive','78141da','lib'],cwd=ROOT)
target=WORK/'baseline';target.mkdir(parents=True,exist_ok=True)
with tarfile.open(fileobj=io.BytesIO(archive)) as t:t.extractall(target,filter='data')
p=target/'lib/value/metrics.ts';p.write_text(p.read_text().replace('return { key, numeric,','return { auditChecks: checks, key, numeric,'))
# Only the independent audit engine carries subtest diagnostics.
extended=ROOT/'research/understandable/inputs/extended-replay.tar.gz'
with tarfile.open(extended,'r:gz') as t:t.extractall(WORK,filter='data')
print('Baseline engine and archived replay inputs prepared')
