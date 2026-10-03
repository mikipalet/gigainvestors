"""Independent fail-closed byte and JSON-path audit of the one-off overlay."""
import collections
import gzip
import hashlib
import json
import pathlib
import sys

baseline, target, ids_file, evidence = map(pathlib.Path, sys.argv[1:])
ids = set(json.loads(ids_file.read_text()))
assert len(ids) == 77
evidence.mkdir(parents=True, exist_ok=True)


def hashes(root):
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(root.rglob('*')) if p.is_file() and '.git' not in p.relative_to(root).parts}


def read(root, f):
    return json.loads((root / f).read_text())


def entries(text):
    """Exact value substrings, so untouched company bytes are also checked."""
    decoder = json.JSONDecoder()
    obj = text.lstrip().startswith('{')
    i = next(i for i, c in enumerate(text) if c in '[{') + 1
    result = {}
    while True:
        while text[i].isspace() or text[i] == ',':
            i += 1
        if text[i] in ']}':
            return result
        if obj:
            key, i = decoder.raw_decode(text, i)
            while text[i].isspace() or text[i] == ':':
                i += 1
        else:
            key = len(result)
        start = i
        _, i = decoder.raw_decode(text, i)
        result[key] = text[start:i]


missing = {'__audit_missing__': True}
diffs = []


def diff(a, b, file, path):
    if a == b:
        return
    if a is missing or b is missing:
        diffs.append({'file': file, 'path': path, 'before': a, 'after': b})
    elif isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(a.keys() | b.keys()):
            diff(a.get(k, missing), b.get(k, missing), file, path + [k])
    elif isinstance(a, list) and isinstance(b, list):
        for i in range(max(len(a), len(b))):
            diff(a[i] if i < len(a) else missing, b[i] if i < len(b) else missing, file, path + [i])
    else:
        diffs.append({'file': file, 'path': path, 'before': a, 'after': b})


raw_company_checks = 0


def company_rows(a, b, raw_a, raw_b, file, prefix, array_rows=False):
    global raw_company_checks
    key = (lambda r: r[0]) if array_rows else (lambda r: r['id'])
    aa, bb = {key(r): r for r in a}, {key(r): r for r in b}
    assert len(aa) == len(a) and len(bb) == len(b), (file, 'duplicate IDs')
    assert [key(r) for r in a if key(r) not in ids] == [key(r) for r in b if key(r) not in ids], (file, 'unrelated order changed')
    ra = {key(r): raw_a[i] for i, r in enumerate(a)}
    rb = {key(r): raw_b[i] for i, r in enumerate(b)}
    for company in aa.keys() | bb.keys():
        if company not in ids:
            assert aa.get(company) == bb.get(company), (file, company, 'unrelated data')
            assert ra.get(company) == rb.get(company), (file, company, 'unrelated bytes')
            raw_company_checks += 1
        diff(aa.get(company, missing), bb.get(company, missing), file, prefix + [company])


before, after = hashes(baseline), hashes(target)
assert before.keys() <= after.keys(), 'No files may be deleted'
changed = [f for f in after if before.get(f) != after[f]]
files = []
for f in changed:
    b = read(target, f)
    a = read(baseline, f) if f in before else None
    files.append({'file': f, 'before': before.get(f), 'after': after[f], 'bytes': (target / f).stat().st_size})
    if f.startswith('dossiers/'):
        assert a is not None
        ra, rb = entries((baseline / f).read_text()), entries((target / f).read_text())
        for company in a.keys() | b.keys():
            if company not in ids:
                assert a.get(company) == b.get(company), (f, company)
                assert ra.get(company) == rb.get(company), (f, company, 'bytes')
                raw_company_checks += 1
            diff(a.get(company, missing), b.get(company, missing), f, [company])
    elif f.startswith('index/'):
        assert a is not None
        company_rows(a, b, entries((baseline / f).read_text()), entries((target / f).read_text()), f, [])
    elif f.startswith('search/') and f != 'search/manifest.json':
        assert a is not None and a.keys() == b.keys() == {'rows', 'aliases'}
        ra, rb = entries((baseline / f).read_text()), entries((target / f).read_text())
        company_rows(a['rows'], b['rows'], entries(ra['rows']), entries(rb['rows']), f, ['rows'], True)
        for alias in a['aliases'].keys() | b['aliases'].keys():
            av, bv = a['aliases'].get(alias, []), b['aliases'].get(alias, [])
            assert bv[:len(av)] == av, (f, alias, 'existing alias offsets changed')
            assert all(b['rows'][offset][0] in ids for offset in bv[len(av):]), (f, alias, 'non-target alias')
            diff(a['aliases'].get(alias, missing), b['aliases'].get(alias, missing), f, ['aliases', alias])
    elif f == 'meta.json':
        start = len(diffs)
        diff(a, b, f, [])
        for d in diffs[start:]:
            p = d['path']
            if p[:2] == ['views', 'deferred']:
                assert isinstance(p[-1], int) and p[-1] >= len(a['views']['deferred']) and d['before'] == missing
            else:
                assert p[0] in ['counts', 'funnel', 'story', 'western'], ('forbidden meta path', p)
                assert p[-1] in ['analysed', 'scored', 'insufficient', 'passing', 'pass', 'fail', 'checking', 'unclear', 'failsOnlyThis', 'qualityShare', 'qualityPasses', 'atBuy', 'countriesCovered'], p
                assert isinstance(d['before'], (int, float)) and isinstance(d['after'], (int, float)), p
    elif f.startswith('views/'):
        assert a is None, 'Existing live views must be byte-identical'
        rows = [dict(zip(b['columns'], row)) for row in b['rows']]
        assert len(rows) == len(ids) and {r['id'] for r in rows} == ids
        # The hash uses compact JS JSON; the builder adds only a final newline.
        assert hashlib.sha256((target / f).read_bytes().rstrip(b'\n')).hexdigest()[:24] == pathlib.Path(f).stem
        for row in rows:
            diff(missing, row, f, [row['id']])
    else:
        raise AssertionError(('Unapproved changed file', f))

# Prove every unrelated dossier, including those in wholly unchanged shards.
def dossiers(root):
    return {k: v for p in (root / 'dossiers').glob('*.json') for k, v in json.loads(p.read_text()).items()}


live_ds, staged_ds = dossiers(baseline), dossiers(target)
assert live_ds.keys() == staged_ds.keys()
assert all(live_ds[k] == staged_ds[k] for k in live_ds if k not in ids)
assert all(staged_ds[k] for k in ids)
assert read(baseline, 'search/manifest.json') == read(target, 'search/manifest.json')
current = pathlib.Path('/Users/miki/value-corpus/publish-repo')
assert hashes(current) == before, 'Live baseline changed during preparation; rebase required'

with gzip.open(evidence / 'spinoff-pub-1-json-path-diff.jsonl.gz', 'wt') as out:
    for d in diffs:
        out.write(json.dumps(d, ensure_ascii=False, separators=(',', ':')) + '\n')
(evidence / 'spinoff-pub-1-file-diff.json').write_text(json.dumps(files, indent=2) + '\n')
(evidence / 'spinoff-pub-1-copy-files.txt').write_text('\n'.join(changed) + '\n')
summary = {'baselineFiles': len(before), 'stagedFiles': len(after), 'changedExistingFiles': sum(f in before for f in changed),
           'addedFiles': sum(f not in before for f in changed), 'unchangedFiles': len(before) - sum(f in before for f in changed),
           'jsonPathDifferences': len(diffs), 'changedFilesByDirectory': dict(collections.Counter(f.split('/')[0] for f in changed)),
           'allowedCompanyIds': sorted(ids), 'unchangedOtherDossiers': len(live_ds.keys() - ids),
           'unchangedCompanyByteComparisonsInChangedFiles': raw_company_checks, 'unexpectedPaths': 0,
           'historyFilesChanged': 0, 'existingViewsChanged': 0, 'liveUnchanged': True,
           'countsBefore': read(baseline, 'meta.json')['counts'], 'countsAfter': read(target, 'meta.json')['counts']}
(evidence / 'spinoff-pub-1-proof.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps({k: v for k, v in summary.items() if k != 'allowedCompanyIds'}, indent=2))
