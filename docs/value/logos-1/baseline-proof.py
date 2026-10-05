import json,pathlib,hashlib
p=pathlib.Path.home()/'data/value-logos';e=p/'evidence';base=json.loads((e/'baseline-logo-sha256.json').read_text());results={}
for label,root in [('copy',p/'corpus/publish-repo'),('live_read_only',pathlib.Path.home()/'value-corpus/publish-repo')]:
 bad=[]
 for f,h in base.items():
  file=root/'logos'/f
  if not file.exists() or hashlib.sha256(file.read_bytes()).hexdigest()!=h:bad.append(f)
 results[label]={'checked':len(base),'changedOrMissing':len(bad),'failures':bad}
old={r['id']:r for r in json.loads((e/'baseline-index.json').read_text())};new={r['id']:r for f in (p/'corpus/publish-repo/index').glob('??.json') for r in json.loads(f.read_text())}
changed=[id for id,r in old.items() if {k:v for k,v in r.items() if k!='lg'}!={k:v for k,v in new[id].items() if k!='lg'}]
changedExisting=[id for id,r in old.items() if r.get('lg') and new[id].get('lg')!=r['lg']]
results['index']={'before':len(old),'after':len(new),'missingBefore':sum(not r.get('lg') for r in old.values()),'missingAfter':sum(not r.get('lg') for r in new.values()),'financialOrOtherFieldChanges':changed,'existingLogoUrlChanges':changedExisting,'idSetUnchanged':set(old)==set(new)}
(e/'baseline-proof.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results));assert not changed and not changedExisting and set(old)==set(new);assert all(results[k]['changedOrMissing']==0 for k in ['copy','live_read_only'])
