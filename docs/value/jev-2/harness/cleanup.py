import os,json,shutil
from pathlib import Path
root=Path(os.environ['PUBFIX_ROOT']).resolve()
assert root==Path.home()/'data/jev-2' or root==Path('/Users/miki/data/jev-2').resolve()
removed=[]
for name in ['corpus','baseline','baseline-out','dry-run','baseline-code','storage','tmp','test-home','node_modules']:
 p=root/name
 if p.is_symlink():p.unlink()
 elif p.exists():shutil.rmtree(p)
 removed.append(str(p))
result={'removed':removed,'remainingCorpusCopies':[], 'freeBytes':{p:shutil.disk_usage(p).free for p in ['/',str(Path.home()/'data')]}}
(root/'evidence/cleanup.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
