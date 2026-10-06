"""Reconstruct an isolated controller proof after scratch cleanup. Never write live."""
import hashlib,json,os,shutil
from pathlib import Path
root=Path.home()/'data/value-holds'; live=Path.home()/'value-corpus'; dst=root/'corpus'; handoff=root/'handoff'
if dst.exists():raise SystemExit('Review corpus already exists; choose an empty review workspace')
for p in [Path('/'),root]:
 if shutil.disk_usage(p).free<4*1024**3:raise SystemExit('DISK STOP: commit and stop')
before=json.loads((root/'evidence/holds-2/live-before.json').read_text())
for rel,want in before['files'].items():
 p=live/'publish-repo'/rel
 if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest()!=want:raise SystemExit('LIVE archive changed; refresh controller audit before replay')
if hashlib.sha256((live/'verdict-freeze.json').read_bytes()).hexdigest()!=before['freezeSha256']:raise SystemExit('LIVE freeze changed; refresh audit')
# Explicit roots exclude credentials, the daily-runner lock, ledgers and run state.
roots=['analysis','bonds','bonds.json','business-backfill','business-fit','calibrations','companies','completeness','dedupe','dedupe.jsonl','enrichment-v7','flags','fundamentals','held-membership','history-return-prices','history-v7','index-membership','jev','judgement','logo-manual','logo-overrides.json','price-story','prices','prices-history','prices-history-long','publish-repo','published-memos','reports','sec','thesis','universe.jsonl','verdict-freeze.json']
dst.mkdir()
def copy(src,target):
 for p in [Path('/'),root]:
  if shutil.disk_usage(p).free<4*1024**3:raise SystemExit('DISK STOP: commit and stop')
 shutil.copy2(src,target)
for rel in roots:
 src=live/rel
 if src.is_dir():shutil.copytree(src,dst/rel,copy_function=copy,ignore=shutil.ignore_patterns('.git'))
 elif src.is_file():copy(src,dst/rel)
for rel in ['eodhd','annual-reviewed','sec-companyfacts','sec-annual','sec-submissions','yahoo-fundamentals','reviewed-trailing','reviewed-common-balance']:
 src=live/'raw'/rel
 if src.is_dir():shutil.copytree(src,dst/'raw'/rel,copy_function=copy)
manifest=json.loads((handoff/'input-manifest.json').read_text())
for rel,want in manifest['files'].items():
 src=handoff/'inputs'/rel
 assert hashlib.sha256(src.read_bytes()).hexdigest()==want
 target=dst/rel;target.parent.mkdir(parents=True,exist_ok=True);copy(src,target)
quotes=json.loads((handoff/'reviewed-quotes.json').read_text())
for id,q in quotes.items():
 if id not in manifest['accepted']:continue
 p=dst/'prices'/f"{id.rsplit('.',1)[1]}.json";rows=json.loads(p.read_text()) if p.exists() else {};rows[id]=q;p.write_text(json.dumps(rows)+'\n')
# All baseline hashes bind to the current copied research, while the explicit
# Fairfax freeze remains in place. Separate unfreeze proposal has its own script.
p=dst/'held-membership/release.json';release=json.loads(p.read_text())
release['baselineAnalysisHashes']={id:hashlib.sha256((dst/'analysis'/f'{id}.json').read_bytes()).hexdigest() if (dst/'analysis'/f'{id}.json').exists() else None for id in release['baselineIds']}
p.write_text(json.dumps(release,indent=2)+'\n')
print('Isolated review corpus restored; LIVE archive, freeze and runner lock untouched')
