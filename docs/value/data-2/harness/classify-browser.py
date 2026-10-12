"""data-2: split the candidate release-gate findings that compare-browser.py could not match on the
same path into (a) the same layout pattern on another page of the baseline arm (the page changed
state, e.g. a neutral dossier now shows its test drawers) and (b) anything else, which fails.
A pattern is the state kind plus the issue with quoted text and numbers abstracted.
Usage: python3 -I classify-browser.py <comparison.json> <baseline dir> <out.json>"""
import json, re, sys, collections
from pathlib import Path
cmp = json.loads(Path(sys.argv[1]).read_text())
live = json.loads((Path(sys.argv[2]) / 'release-gate/report.json').read_text())
state = lambda s: 'Price story' if s.startswith('Price story') else re.sub(r'\d+', '<n>', s)
def kind(i):
    # The clamped price-story line ("Up 404% since Oct 2023 · ...") quotes text that itself contains quotes.
    if re.match(r'overlapping text: "(Up|Down) \d+% since ', i): return 'overlapping text: price-story line / next element'
    if i.startswith('overlapping text: '): return 'overlapping text: <q> / <q>'
    return re.sub(r'\d[\d,.]*', '<n>', re.sub(r'"[^"]*"', '"<q>"', i))
pattern = lambda s, i: (state(s) if not s.startswith('Open ') else 'Open <drawer>', kind(i))
seen = {pattern(r['state'], i) for r in live for i in r.get('issues', [])}
out = {'stateDriven': [], 'other': []}
for f in cmp['newFindings']:
    (out['stateDriven'] if pattern(f['state'], f['issue']) in seen else out['other']).append(f)
summary = {'new': len(cmp['newFindings']), 'stateDriven': len(out['stateDriven']), 'other': len(out['other']), 'interactionFailures': cmp['interactionFailures'], 'pass': not out['other'] and not cmp['interactionFailures'],
           'otherFindings': out['other'], 'stateDrivenByPattern': collections.Counter(' | '.join(pattern(f['state'], f['issue'])) for f in out['stateDriven']).most_common()}
Path(sys.argv[3]).write_text(json.dumps(summary, indent=1) + '\n')
print(json.dumps({k: summary[k] for k in ['new', 'stateDriven', 'other', 'pass']}))
for f in out['other']: print(' ', f['path'], f['width'], f['state'][:45], '|', f['issue'][:140])
