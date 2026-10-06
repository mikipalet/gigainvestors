"""Install only accepted held inputs into this task's independent copy."""
import json,hashlib,shutil
from pathlib import Path
root=Path.home()/'data/regress';dst=root/'corpus';handoff=Path.home()/'data/value-holds/handoff'
assert dst.resolve()!= (Path.home()/'value-corpus').resolve()
manifest=json.loads((handoff/'input-manifest.json').read_text())
accepted=set(manifest['accepted']);copied={}
release=json.loads((dst/'held-membership/release.json').read_text())
for rel,want in manifest['files'].items():
 # Do not install old analysis, fingerprints, or old global preservation policy.
 if rel.split('/')[0] in ['analysis','held-membership','index-membership','universe.jsonl','verdict-freeze.json']:continue
 if not any('/'+id+'.' in '/'+rel or '/'+id+'/' in '/'+rel for id in accepted):continue
 src=handoff/'inputs'/rel
 assert hashlib.sha256(src.read_bytes()).hexdigest()==want,rel
 target=dst/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,target);copied[rel]=want
# Preserve the original baseline fingerprint policy; add approved membership only.
release['additionIds']=sorted(set(release['additionIds'])|accepted)
release['held']=[r for r in release['held'] if r['id']not in accepted]
(dst/'held-membership/release.json').write_text(json.dumps(release,indent=2)+'\n')
rows=[json.loads(line)for line in (dst/'universe.jsonl').read_text().splitlines() if line.strip()];ids={r['id'] for r in rows}
for id in sorted(accepted):
 if id not in ids:rows.append(json.loads((dst/'companies'/f'{id}.json').read_text()))
(dst/'universe.jsonl').write_text(''.join(json.dumps(r)+'\n'for r in rows))
quotes=json.loads((handoff/'reviewed-quotes.json').read_text())
for id in sorted(accepted):
 p=dst/'prices'/f'{id.rsplit(".",1)[1]}.json';data=json.loads(p.read_text())if p.exists()else {};data[id]=quotes[id];p.write_text(json.dumps(data)+'\n')
(root/'evidence/held-input-install.json').write_text(json.dumps({'accepted':sorted(accepted),'copied':copied,'held':len(release['held']),'baselinePolicy':'original fingerprint map retained'},indent=2)+'\n')
print('Installed',len(copied),'held input files;',len(accepted),'accepted;',len(release['held']),'held')
