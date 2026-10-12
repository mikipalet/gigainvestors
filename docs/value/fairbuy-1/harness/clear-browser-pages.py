"""Remove only the runtime-generated ISR pages of the tested companies before a browser arm,
so two stores never share Next's on-disk responses (as rules-7). Usage: clear-browser-pages.py <ids> <evidence dir>"""
import json, shutil, sys
from pathlib import Path
build = Path('.next'); ids = sys.argv[1].split(',')
routes = json.loads((build / 'prerender-manifest.json').read_text())['routes']
names = {n for i in ids for n in {i.lower(), i.lower().removesuffix('.us')}}
assert not any(r.lower().removeprefix('/s/') in names for r in routes), 'a tested company is prerendered at build time'
removed = []
for p in (build / 'server/app/s').iterdir():
    if p.name.lower().removesuffix(p.suffix.lower()) not in names: continue
    assert p.suffix in {'.html', '.rsc', '.meta', '.segments'}
    shutil.rmtree(p) if p.is_dir() else p.unlink(); removed.append(p.name)
with (Path(sys.argv[2]) / 'browser-store-isolation.jsonl').open('a') as f:
    f.write(json.dumps({'buildId': (build / 'BUILD_ID').read_text().strip(), 'removed': sorted(removed)}) + '\n')
