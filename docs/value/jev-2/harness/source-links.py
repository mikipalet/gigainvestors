import json,subprocess
from pathlib import Path
# Preserve the previously reviewed issuer documents; no new provider requests.
root=Path('docs/value/jev-2')
for name in ['GAMA.LSE','YUMC.US','ALSN.US','FDJU.PA']:
 r=json.loads(subprocess.check_output(['git','show',f'352c4a8:research/jev-perimeter/evidence/review-{name}-current.json']))
 (root/f'{name}-sources.json').write_text(json.dumps(r['sources'],indent=2)+'\n')
