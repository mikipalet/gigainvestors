"""Local coverage and immutability proof. Does not write the controller report."""
import hashlib
import json
import os
from pathlib import Path

root = Path(os.environ.get('VALUE_CORPUS_DIR', str(Path.home() / 'data/value-cover')))
stage = root / 'staging/coverage'
baseline = root / 'publish-repo'
def read(file):
    return json.loads(file.read_text())
def dossiers(folder):
    return {k: v for f in (folder / 'dossiers').glob('*.json') for k, v in read(f).items()}
before, after = dossiers(baseline), dossiers(stage)
if not after:
    raise SystemExit('No staged dossiers; run publish --out first')
manifest = read(root / 'held-membership/baseline-sha256.json')
source_changed = [file for file, digest in manifest.items() if not (baseline/file).exists() or hashlib.sha256((baseline/file).read_bytes()).hexdigest() != digest]
changed = [id for id, value in before.items() if json.dumps(after.get(id), ensure_ascii=False) != json.dumps(value, ensure_ascii=False)]
index_changed = []
for file in (baseline / 'index').glob('*.json'):
    old = read(file)
    old_ids = {r['id'] for r in old}
    new = read(stage / 'index' / file.name) if (stage/'index'/file.name).exists() else []
    if [r for r in new if r['id'] in old_ids] != old:
        index_changed.append(file.name)
prices_changed = []
for file in (baseline/'prices').glob('*.json'):
    if len(file.stem) != 2:
        continue
    old, new = read(file), read(stage/'prices'/file.name)
    prices_changed += [id for id in before if id in old and new.get(id) != old[id]]
aliases = read(stage/'aliases.json')
membership = read(root/'held-membership/latest.json')
ledger = []
for row in membership['ledger']:
    id = row['id']
    target = id if id in after else aliases.get(id)
    result = {**row, 'dossier': target if target in after else None}
    if row['status'] == 'mapped':
        if target in after:
            result['coverage'] = 'existing' if target in before else 'added'
        elif not (root/f'fundamentals/{id}.json').exists():
            result['coverage'] = 'pending-fundamentals-quota'
        else:
            result['coverage'] = 'pending-publication-evidence'
            analysis_file = root/f'analysis/{id}.json'
            if analysis_file.exists():
                a = read(analysis_file)
                result['analysisStatus'] = a.get('status')
                result['analysisVersion'] = a.get('versions')
                result['reasons'] = {k: t.get('reasons') for k, t in a.get('tests', {}).items() if t.get('result') not in ['pass', 'fail']}
    else:
        result['coverage'] = row['status']
    ledger.append(result)
counts = {status: sum(r['coverage'] == status for r in ledger) for status in sorted({r['coverage'] for r in ledger})}
summary = {'quarters': membership['quarters'], 'stockRecords': len(ledger),
           'heldTickers': sum(r['status'] != 'outside-window' for r in ledger), 'coverage': counts,
           'baselineDossiers': len(before), 'stagedDossiers': len(after), 'addedDossiers': len(after.keys()-before.keys()),
           'baselineFileChanges': source_changed, 'changedExistingDossiers': changed,
           'changedExistingIndexes': index_changed, 'changedExistingPrices': prices_changed,
           'PLXS': 'PLXS.US' in after}
out = root/'held-validation'
out.mkdir(exist_ok=True)
(out/'coverage-ledger.json').write_text(json.dumps(ledger, indent=2) + '\n')
(out/'coverage-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(summary))
if source_changed or changed or index_changed or prices_changed:
    raise SystemExit('Immutability proof failed')
