"""currency-1: classify every candidate release-gate finding against the same production build serving
the bound live (63fad7cb, 3.8.1) archive. New findings fail, as in rules-7; owner-accepted 12px chrome and
whitespace measurements are listed separately. Usage: compare-browser.py <candidate dir> <baseline dir> <out.json>"""
import json, re, sys
from pathlib import Path
cand = json.loads((Path(sys.argv[1]) / 'release-gate/report.json').read_text())
live = json.loads((Path(sys.argv[2]) / 'release-gate/report.json').read_text())
owner = json.loads(Path('docs/value/dedupe-1/browser-report.json').read_text())
allowed = {i for row in owner for i in row.get('issues', []) if i.startswith('text below 13px:') and i.endswith('(12px)')}
# State names carry counts ("+296 more"); the Buy rule changes those counts, not the control.
key = lambda row: (row['path'], re.sub(r'\d+', '<n>', row['state'].split(':')[0] if row['state'].startswith('Price story:') else row['state']), row['width'], row['height'])
lookup = {key(row): set(row.get('issues', [])) for row in live}
shape = lambda issue: re.sub(r'\d[\d,.]*', '<n>', issue)
# 3.8.2 adds no interface copy outside the method page; every finding is classified against the baseline arm.
NEW_COPY = re.compile(r'(?!)')
# The Buy zone's list button keeps its control style; only its words changed ("+N more" -> "See all N").
SAME_CONTROL = {'text below 13px: "See all" (12px)': 'text below 13px: "more ↗" (12px)'}
counts = {'ownerChrome': 0, 'ownerWhitespace': 0, 'preExisting': 0, 'new': 0}; new = []
for row in cand:
    for issue in row.get('issues', []):
        issue = SAME_CONTROL.get(issue, issue)
        if NEW_COPY.search(issue): d = 'new'
        elif issue in allowed or re.fullmatch(r'text below 13px: ".*" \(12px\)', issue) and any(a.split(':')[1] == issue.split(':')[1] for a in allowed): d = 'ownerChrome'
        elif issue.startswith(('bottom empty area ', 'empty block ', 'raster empty area ')): d = 'ownerWhitespace'
        elif shape(issue) in {shape(i) for i in lookup.get(key(row), set())}: d = 'preExisting'
        else: d = 'new'
        counts[d] += 1
        if d == 'new': new.append({'path': row['path'], 'state': row['state'], 'width': row['width'], 'issue': issue})
# The release gate waits for a dossier or list container; the method page has neither, on both arms.
base_interactions = {(v['path'], v['width']) for v in live if v['state'] == 'interaction failure'}
interactions = [v for v in cand if v['state'] == 'interaction failure' and (v['path'], v['width']) not in base_interactions]
preexisting_interactions = [(v['path'], v['width']) for v in cand if v['state'] == 'interaction failure' and (v['path'], v['width']) in base_interactions]
summary = {'candidateStates': len(cand), 'baselineStates': len(live), 'viewports': sorted({f"{v['width']}x{v['height']}" for v in cand}),
           'paths': sorted({v['path'] for v in cand}), 'counts': counts, 'newFindings': new, 'interactionFailures': interactions, 'preExistingInteractionFailures': preexisting_interactions, 'pass': not new and not interactions}
Path(sys.argv[3]).write_text(json.dumps(summary, indent=1) + '\n')
print(json.dumps({k: v for k, v in summary.items() if k != 'newFindings'}), '\nnew:', json.dumps(new[:40], indent=0))
