import hashlib,json,shutil
from pathlib import Path
r=Path('/Users/miki/data/regress/run2');live=Path('/Users/miki/value-corpus')
m=json.loads(Path('/Users/miki/data/regress/release-bundle/manifest.json').read_text());rows=[]
for id in m['failedCacheIds']:
 row={'id':id,'retained':[],'absentInLive':[]}
 for rel in [f'analysis/{id}.json',f'analysis/inputs/{id}.json']:
  src=live/rel;dst=r/'corpus'/rel
  if src.exists():
   dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
   digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
   assert digest(src)==digest(dst);row['retained'].append({'file':rel,'sha256':digest(dst)})
  else:
   assert not dst.exists(),rel;row['absentInLive'].append(rel)
 rows.append(row)
(r/'evidence/retained-cache-failures.json').write_text(json.dumps(rows,indent=2)+'\n')
print('Retained live cache-failure state:',len(rows))
