"""Distinguish orphan asset cleanup from loss of any published logo reference."""
import json
import re
from pathlib import Path

root=Path('/Users/miki/data/value-rules/.audit/rules-3')
missing=[]
changed=[]
for file in (root/'baseline/logos').glob('*.json'):
    candidate=root/'candidate-final/logos'/file.name
    if not candidate.exists():
        missing.append(file.stem)
    elif file.read_bytes()!=candidate.read_bytes():
        changed.append(file.name)
references={key:[] for key in missing}
if missing:
    pattern=re.compile('|'.join(map(re.escape,missing)))
    for file in (root/'baseline').rglob('*.json'):
        if file.parent.name=='logos':
            continue
        for key in set(pattern.findall(file.read_text())):
            references[key].append(str(file.relative_to(root/'baseline')))
result={'omittedAssets':len(missing),'references':references,
        'allUnreferenced':all(not value for value in references.values()),
        'presentFilesByteChanged':len(changed),'changedFiles':changed}
(root/'evidence/omitted-logo-assets.json').write_text(json.dumps(result,indent=2)+'\n')
print('Unreferenced assets omitted:',len(missing),'; changed retained assets:',len(changed))
assert result['allUnreferenced'] and not changed, 'Published logo asset regression'
