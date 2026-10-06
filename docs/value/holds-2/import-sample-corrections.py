"""Install reviewed transcription records; conversion bases are explicit data."""
import hashlib, json, os
from pathlib import Path

root = Path.home() / 'data/value-holds'
records = json.loads(Path('docs/value/holds-2/sample-correction-inputs.json').read_text())
selected = set(os.environ.get('VALUE_ONLY', '').split(',')) - {''}
for company, record in records.items():
    if selected and company not in selected:
        continue
    for proof in record['evidence']['proofs'].values():
        body = (root / 'downloads' / proof['file']).read_bytes()
        assert hashlib.sha256(body).hexdigest() == proof['sha256']
        assert all(' '.join(a.split()) in ' '.join(body.decode().split()) for a in proof['anchors'])
    target = root / 'corpus/raw/annual-reviewed' / f'{company}.json'
    target.write_text(json.dumps(record, indent=2) + '\n')
