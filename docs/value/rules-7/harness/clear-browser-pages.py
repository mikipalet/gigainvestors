"""Run each browser arm sequentially with fresh runtime-generated company pages.

The two data stores must not share Next's on-disk ISR responses. These five
routes are generated on first request, not part of the production build.
"""
import json,shutil,sys
from pathlib import Path
root=Path('/Users/miki/data/value-rules');code=Path(sys.argv[1]) if len(sys.argv)>1 else root;build=code/'.next'
routes=json.loads((build/'prerender-manifest.json').read_text())['routes']
import os
names={i.lower() for i in os.environ['BROWSER_IDS'].split(',')}
assert not any(route.lower().removeprefix('/s/')in names for route in routes)
removed=[]
for p in (build/'server/app/s').iterdir():
 if p.stem.lower()not in names:continue
 assert p.suffix in {'.html','.rsc','.meta','.segments'}
 if p.is_dir():shutil.rmtree(p)
 else:p.unlink()
 removed.append(p.name)
receipt={'method':'Sequential live/candidate servers; remove only runtime ISR artifacts for the five tested companies before each arm','codeRoot':str(code),'buildId':(build/'BUILD_ID').read_text().strip(),'removed':sorted(removed)}
with (root/'.audit/rules-7/evidence/browser-store-isolation.jsonl').open('a')as f:f.write(json.dumps(receipt)+'\n')
