from pathlib import Path
import shutil
root=Path('/Users/miki/data/value-dedupe-2');source=root/'corpus';dest=root/'replay-corpus';dest.mkdir()
# Inputs may link only into our private dereferenced copy. Own all mutable outputs.
mutable={'staging','history-return-prices','publish-repo','usage'}
for p in source.iterdir():
 if p.name=='publish-repo':shutil.copytree(root/'staging/release',dest/p.name)
 elif p.name in mutable:shutil.copytree(p,dest/p.name) if p.is_dir() else shutil.copy2(p,dest/p.name)
 else:(dest/p.name).symlink_to(p,target_is_directory=p.is_dir())
print('Replay corpus prepared with private inputs and independent publication/cache outputs')
