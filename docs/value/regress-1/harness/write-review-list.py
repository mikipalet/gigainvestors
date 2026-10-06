import json,collections,shutil
from pathlib import Path
r=Path.home()/'data/regress';e=r/'evidence';d=Path('docs/value/regress-1');records=json.loads((e/'audit-classifications.json').read_text());losses=json.loads((e/'public-valuation-loss-evidence.json').read_text());byid={x['id']:x for x in losses}
review=[x for x in records if x['classification']=='controller-review'];groups=collections.defaultdict(list)
for x in review:groups[x['kind']].append(x)
lines=['# Residual approval list — NOT','', 'No entry below is approved. The three exact manifest changes and nine understand changes are already separated in `audit-classifications.json`. Primary-source explanations are limited to the 26 numeric cells with matching filed facts. A guard firing is not proof that the source data is correct.','', '## Additional buy transitions','', '| Company | Before | After |','|---|---|---|']
for x in groups['buy']:lines.append('| '+x['id']+' | `'+json.dumps(x['before'],separators=(',',':'))+'` | `'+json.dumps(x['after'],separators=(',',':'))+'` |')
lines+=['','## Other quality-test changes','', '477 test transitions across 175 companies. Reasons and source-bound annual input deltas are retained in the evidence bundle. Restored history explains many `na` transitions mechanically; it does not grant approval or prove every underlying source input.','', '| Company | Test transitions |','|---|---|']
by=collections.defaultdict(list)
for x in groups['quality-test']:by[x['id']].append(x)
for id,rs in sorted(by.items()):lines.append('| '+id+' | '+'; '.join(x['test']+': '+' → '.join(x['change'])for x in rs)+' |')
lines+=['','## Numeric values becoming null','', '| Company | Field | Previous value |','|---|---|---|']
for x in sorted(groups['numeric-null'],key=lambda x:(x['id'],x['path'])):lines.append(f"| {x['id']} | `{x['path']}` | {x['before']} |")
lines+=['','## Public valuations becoming null','', '190 are hidden by publication share checks; 51 are unavailable in the refreshed analysis. Missing latest-quarter components are not assumed zero or filled from an older annual statement. `public-valuation-loss-evidence.json` retains the old value, raw value/reason, share checks, capitalization checks, and same-period balance evidence where available.','', '| Company | Blocking cause |','|---|---|']
for x in sorted(losses,key=lambda x:x['id']):
 reason=x.get('rawReason')or'; '.join((x.get('publishShareCheck')or{}).get('reasons',[]))or'Inspect public-valuation-loss-evidence.json'
 lines.append('| '+x['id']+' | '+x['cause']+': '+str(reason).replace('|','/').replace('\n',' ')+' |')
lines+=['','## Removed numeric fields and periods','', 'A separate conservative audit also records 6,209 previously numeric fields or period cells that are absent from the candidate shape. These are not counted as explicit `number → null` transitions. They are retained in `candidate-numeric-removed.json`, included in the per-company source-delta evidence, and remain unapproved. Do not infer approval from their omission from the 79 explicit-null count.','', '## Browser gate','', 'The raw gate and prior owner dispositions remain unchanged. Unaccepted overlap findings are listed in `browser-summary.json`; all desktop/mobile screenshots are retained in the evidence bundle.','']
(d/'residual-approval-list.md').write_text('\n'.join(lines))
for name in ['candidate-summary.json','candidate-test-changes.json','candidate-numeric-nulls.json','candidate-numeric-removed.json','candidate-valuation-nulls.json','audit-classifications.json','residual-summary.json','final-integrity.json','browser-summary.json','source-hash-summary.json']:
 shutil.copy2(e/name,d/name)
print('Review ledger entries:',len(review),'companies:',len({x['id']for x in review}))
