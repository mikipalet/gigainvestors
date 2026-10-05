from pathlib import Path
import json,hashlib,datetime
out=Path('docs/value/dedupe-2');live=Path('/Users/miki/value-corpus/publish-repo');copy=Path('/Users/miki/data/value-dedupe-2/corpus/publish-repo')
def hashes(root):
 return {str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file() and '.git' not in p.relative_to(root).parts}
before=json.loads((out/'live-before.json').read_text())['files'];now=hashes(live);copied=hashes(copy)
def delta(a,b):return [k for k in sorted(a.keys()|b.keys()) if a.get(k)!=b.get(k)]
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'liveCount':len(now),'copyCount':len(copied),'liveChangesSinceStart':delta(before,now),'copyDifferences':delta(now,copied),'hashes':now}
(out/'live-archive-proof.json').write_text(json.dumps(result,indent=2)+'\n')
print({k:v for k,v in result.items() if k!='hashes'})
assert not result['liveChangesSinceStart'] and not result['copyDifferences']
