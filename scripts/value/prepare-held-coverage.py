"""Snapshot inputs into the data volume. No writes through shared corpus symlinks.

Resume is idempotent: existing isolated files are never overwritten.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys

source = Path(os.environ.get('VALUE_BASE_CORPUS', str(Path.home() / 'value-corpus')))
target = Path(os.environ.get('VALUE_CORPUS_DIR', str(Path.home() / 'data/value-cover')))
if source.resolve() == target.resolve():
    raise SystemExit('Coverage requires an isolated corpus')
if shutil.disk_usage('/').free < 4 * 1024**3:
    raise SystemExit('Disk below 4 GiB; commit and stop')
target.mkdir(parents=True, exist_ok=True)

def copy(rel):
    src, dst = source / rel, target / rel
    if not src.exists() or dst.exists():
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    if src.is_dir():
        shutil.copytree(src, dst, ignore=shutil.ignore_patterns('.git'))
    else:
        shutil.copy2(src, dst)

# Public baseline and small global inputs. Credentials are read by the runner
# directly from source, never copied into the isolated corpus or the repository.
for rel in ['universe.jsonl', 'index-membership/latest.json', 'raw/eodhd/universe',
            'publish-repo', 'verdict-freeze.json', 'bonds', 'prices', 'sec',
            'calibrations', 'enrichment-v7/logos', 'enrichment-v7/names', 'enrichment-v7/companies', 'enrichment-v7/about']:
    copy(rel)

membership = target / 'held-membership/latest.json'
if membership.exists():
    baseline = {k: v for f in (target / 'publish-repo/dossiers').glob('*.json') for k, v in json.loads(f.read_text()).items()}
    aliases = json.loads((target / 'publish-repo/aliases.json').read_text())
    snapshot = json.loads(membership.read_text())
    additions = [c['id'] for c in snapshot['companies'] if c['id'] not in baseline and aliases.get(c['id']) not in baseline]
    prefixes = ['companies', 'fundamentals', 'raw/eodhd', 'raw/sec-companyfacts', 'raw/yahoo-fundamentals',
                'analysis', 'analysis/inputs', 'analysis/fingerprints', 'jev', 'judgement',
                'prices-history', 'prices-history/meta', 'flags', 'enrichment-v7/share-checks',
                'business-fit/overview', 'business-backfill/memos', 'business-backfill/facts']
    for id in additions:
        for prefix in prefixes:
            copy(f'{prefix}/{id}.json')
        copy(f'reports/{id}')
    (target / 'held-membership/additions.json').write_text(json.dumps(additions) + '\n')
    manifest = target / 'held-membership/baseline-sha256.json'
    if not manifest.exists():
        hashes = {str(f.relative_to(target / 'publish-repo')): hashlib.sha256(f.read_bytes()).hexdigest()
                  for f in (target / 'publish-repo').rglob('*') if f.is_file()}
        manifest.write_text(json.dumps(hashes) + '\n')
    print(json.dumps({'additions': len(additions), 'baseline': len(baseline), 'corpus': str(target)}))
else:
    print('Baseline ready; run held-membership, then repeat preparation to copy addition caches')
