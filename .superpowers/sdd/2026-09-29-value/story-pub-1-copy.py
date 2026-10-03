import hashlib,json,os,shutil,gzip
from pathlib import Path
source=Path('/Users/miki/value-corpus/publish-repo');target=Path('/tmp/value-story-store');out=Path('.story-pub-1')
assert not target.exists(),'Refuse to overwrite existing staging store'
def inventory(root):
 return {str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob('*')) if p.is_file()}
assert os.statvfs('/tmp').f_bavail*os.statvfs('/tmp').f_frsize>4*1024**3
hashes=inventory(source)
with gzip.open(out/'source-hashes.json.gz','wt') as f:json.dump(hashes,f)
hold=Path('/Users/miki/value-corpus/publish.hold')
(out/'hold-hash.txt').write_text(hashlib.sha256(hold.read_bytes()).hexdigest()+'\n')
shutil.copytree(source,target,ignore=shutil.ignore_patterns('.git'),copy_function=shutil.copy2)
expected={p:h for p,h in hashes.items() if not p.startswith('.git/') and p!='.git'}
assert inventory(target)==expected
(out/'baseline-copy-list.txt').write_text(''.join(f'{p}\n' for p in expected))
print(json.dumps({'copiedFiles':len(expected),'allSourceFilesIncludingGit':len(hashes),'independentCopy':True}))
