"""Merge only accepted addition inputs into the nightly corpus, under its lock.

Raw bodies remain on the data volume. Existing files are backed up before an
atomic replacement; no baseline company, archive or credential is modified.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil

source = Path(os.environ.get('VALUE_COVER_CORPUS', str(Path.home()/'data/value-cover')))
target = Path(os.environ.get('VALUE_CORPUS_DIR', str(Path.home()/'value-corpus')))
lock_pid = os.environ.get('VALUE_DAILY_LOCK_PID')
if not lock_pid or (target/'daily-runner.lock/pid').read_text().strip() != lock_pid:
    raise SystemExit('Acquire the nightly runner lock with with-daily-lock.sh first')
os.kill(int(lock_pid), 0)
if target.resolve() == source.resolve():
    raise SystemExit('Integration requires separate coverage and nightly corpora')
release = json.loads((source/'held-membership/release.json').read_text())
if set(release['baselineIds']) & set(release['additionIds']):
    raise SystemExit('Baseline and additions overlap')
backup = source/'held-validation/cover-3-integration-backup'
backup.mkdir(parents=True, exist_ok=True)
journal = []
freeze_file=target/'verdict-freeze.json'
freeze_hash=hashlib.sha256(freeze_file.read_bytes()).hexdigest() if freeze_file.exists() else None
def disk():
    if shutil.disk_usage('/').free < 4*1024**3:
        raise SystemExit('DISK STOP: commit and stop')
def install(rel, raw=False):
    disk()
    src,dst = source/rel,target/rel
    if not src.exists(): return
    if dst.exists() and dst.is_file() and src.is_file() and src.read_bytes()==dst.read_bytes(): return
    saved = backup/rel
    if (dst.exists() or dst.is_symlink()) and not (saved.exists() or saved.is_symlink()):
        saved.parent.mkdir(parents=True,exist_ok=True)
        if dst.is_dir(): shutil.copytree(dst,saved,symlinks=True)
        elif dst.is_symlink(): saved.symlink_to(os.readlink(dst))
        else: shutil.copy2(dst,saved)
    dst.parent.mkdir(parents=True,exist_ok=True)
    if src.is_dir():
        # Report directories contain metadata, extracted sections and source bodies.
        for f in src.rglob('*'):
            if f.is_file(): install(str(f.relative_to(source)),raw)
        return
    tmp=dst.with_name(dst.name+'.coverage-tmp')
    if tmp.exists() or tmp.is_symlink(): tmp.unlink()
    if raw: tmp.symlink_to(src.resolve())
    else: shutil.copy2(src,tmp)
    tmp.replace(dst)
    journal.append({'path':rel,'sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'rawSymlink':raw})
    if len(journal)%100==0: (backup/'journal.json').write_text(json.dumps(journal,indent=2)+'\n')

prefixes=['companies','fundamentals','analysis','analysis/inputs','analysis/fingerprints','jev','judgement','prices-history','prices-history/meta','flags','enrichment-v7/share-checks','business-fit/overview','business-backfill/memos','business-backfill/facts','enrichment-v7/companies','enrichment-v7/names','enrichment-v7/about','thesis','price-story/readings']
for id in release['additionIds']:
    for prefix in prefixes: install(f'{prefix}/{id}.json')
    install(f'reports/{id}',raw=True)
    for prefix in ['eodhd','sec-companyfacts','yahoo-fundamentals','annual-reviewed']:
        install(f'raw/{prefix}/{id}.json',raw=True)
# Only addition quotes are merged. The published baseline remains untouched.
for file in (source/'staging/cover-3/prices').glob('??.json'):
    dst=target/'prices'/file.name
    prior=json.loads(dst.read_text()) if dst.exists() else {}
    updates=json.loads(file.read_text())
    for id in release['additionIds']:
        if id in updates: prior[id]=updates[id]
    saved=backup/'prices'/file.name
    if dst.exists() and not saved.exists():
        saved.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(dst,saved)
    tmp=dst.with_name(dst.name+'.coverage-tmp');tmp.write_text(json.dumps(prior,separators=(',',':'))+'\n');tmp.replace(dst)
# Logos are content-addressed; install any accepted identity's referenced asset.
for id in release['additionIds']:
    for prefix in ['enrichment-v7/logos']:
        install(f'{prefix}/{id}.json')
for f in (source/'enrichment-v7/logos/assets').glob('*.json'):
    if not (target/f.relative_to(source)).exists(): install(str(f.relative_to(source)))
for rel in ['held-membership/latest.json','held-membership/resolutions.json','held-membership/additions.json']:
    install(rel)
# Capture the nightly analysis state under the same lock. Unchanged cached
# research retains the released baseline; subsequent reanalysis can update it.
release['baselineAnalysisHashes']={id:hashlib.sha256((target/f'analysis/{id}.json').read_bytes()).hexdigest() if (target/f'analysis/{id}.json').exists() else None for id in release['baselineIds']}
dst=target/'held-membership/release.json'
saved=backup/'held-membership/release.json'
if dst.exists() and not saved.exists():
    saved.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(dst,saved)
tmp=dst.with_name(dst.name+'.coverage-tmp');tmp.write_text(json.dumps(release,indent=2)+'\n');tmp.replace(dst)
(backup/'journal.json').write_text(json.dumps(journal,indent=2)+'\n')
if freeze_hash != (hashlib.sha256(freeze_file.read_bytes()).hexdigest() if freeze_file.exists() else None):
    raise SystemExit('Verdict freeze changed during integration')
result={'accepted':len(release['additionIds']),'held':len(release['held']),'installedFiles':len(journal),'backup':str(backup),'verdictFreezeSha256':freeze_hash,'verdictFreezeUnchanged':True}
(source/'held-validation/cover-3-integration.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
