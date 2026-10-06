"""Restore archived, still-current index members absent from the universe cache."""
import json,hashlib
from pathlib import Path
root=Path.home()/'data/regress';c=root/'corpus'
p=c/'universe.jsonl';before=hashlib.sha256(p.read_bytes()).hexdigest()
u={r['id']:r for r in map(json.loads,p.read_text().splitlines())}
m=json.loads((c/'index-membership/latest.json').read_text())['memberships']
d={i:d for f in(root/'baseline/dossiers').glob('*.json')for i,d in json.loads(f.read_text()).items()}
added=[]
for id in ['RACE.MI','STLAM.MI']:
 assert m[id] and id in d
 if id not in u:
  company=d[id]['company'];assert company['indexes']==m[id]
  with p.open('a')as f:f.write(json.dumps(company,separators=(',',':'))+'\n')
  added.append({'id':id,'company':company,'evidence':'Unchanged archived identity and matching current index-membership/latest.json memberships'})
(root/'evidence/restored-canonical-identities.json').write_text(json.dumps({'beforeSha256':before,'afterSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'added':added},indent=2)+'\n')
print('Restored canonical identities:',len(added))
