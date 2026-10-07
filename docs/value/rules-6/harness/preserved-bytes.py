"""Compare exact JSON record bytes, not just parsed equality or Buy flags."""
import hashlib
import json
import re
from pathlib import Path

root = Path('/Users/miki/data/value-rules/.audit/rules-6')
ids = [r['id'] for r in json.loads((root/'corpus/staging/preserved-buy-transitions.json').read_text())]
decoder = json.JSONDecoder()

def shard(company):
    h=0x811c9dc5
    for b in company.encode():h=((h^b)*0x01000193)&0xffffffff
    return f'{h%600:03d}'

def records(store, company):
    result = {}
    for directory in ['dossiers', 'index', 'history', 'search', 'prices']:
        for file in ([store/directory/(shard(company)+'.json')] if directory=='dossiers' else sorted((store / directory).glob('*.json'))):
            text = file.read_text()
            if json.dumps(company) not in text:
                continue
            data = json.loads(text)
            rel = str(file.relative_to(store))
            if directory in ['dossiers', 'prices'] and company in data:
                match = re.search(re.escape(json.dumps(company)) + r'\s*:\s*', text)
                _, end = decoder.raw_decode(text, match.end())
                result[rel] = text[match.end():end].encode()
            elif directory in ['index', 'history'] and isinstance(data, list):
                # Preserve the original serialization of each complete array row.
                offset = 1
                while offset < len(text):
                    while text[offset:offset+1] in [' ', '\n', '\r', '\t', ',']:
                        offset += 1
                    if text[offset:offset+1] == ']':
                        break
                    row, end = decoder.raw_decode(text, offset)
                    identity = row.get('id') if isinstance(row, dict) else row[0]
                    if identity == company:
                        result[rel] = text[offset:end].encode()
                    offset = end
            elif directory == 'search' and isinstance(data, dict) and 'rows' in data:
                for match in re.finditer(r'\[\s*' + re.escape(json.dumps(company)) + r'\s*,', text):
                    _, end = decoder.raw_decode(text, match.start())
                    result[rel] = text[match.start():end].encode()
    assert any(key.startswith('dossiers/') for key in result), company
    assert any(key.startswith('index/') for key in result), company
    return result

proof = []
for company in ids:
    live = records(Path('/Users/miki/value-corpus/publish-repo'), company)
    baseline = records(root / 'baseline', company)
    assert live == baseline, f'Live baseline drift: {company}'
    for arm in ['candidate-final', 'corpus/publish-repo']:
        candidate = records(root / arm, company)
        assert live == candidate, f'Record bytes differ: {company}, {arm}'
    proof.append({'id': company, 'byteIdentical': True, 'records': len(live),
                  'sha256': {key: hashlib.sha256(value).hexdigest() for key, value in live.items()}})
(root / 'evidence/preserved-record-bytes.json').write_text(json.dumps(proof, indent=2) + '\n')
print('Complete record bytes match live for all unapproved held identities')
