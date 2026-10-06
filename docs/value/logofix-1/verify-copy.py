"""Read-only comparison of local --out evidence; never reads runner locks or secrets."""
import hashlib,json,sys
from pathlib import Path
mode,root_arg,bundle_arg,*extra=sys.argv[1:]
root,bundle=Path(root_arg),Path(bundle_arg)
manifest=json.loads((bundle/'manifest.json').read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def rows(p):return {r['id']:r for f in sorted((p/'index').glob('??.json')) for r in json.loads(f.read_text())}
def dossiers(p):return {i:r for f in sorted((p/'dossiers').glob('[0-9][0-9][0-9].json')) for i,r in json.loads(f.read_text()).items()}
def coverage(p):
 r=rows(p);return {'total':len(r),'missing':sum(not x.get('lg') for x in r.values()),'USMissing':sum(not x.get('lg') for i,x in r.items() if i.endswith('.US')),'missingIds':sorted(i for i,x in r.items() if not x.get('lg'))}
if mode=='records':
 entries=[]
 for e in manifest['entries']:
  if not e['logo']:continue
  p=root/'enrichment-v7/logos'/f"{e['id']}.json";record=json.loads(p.read_text())
  entries.append({'id':e['id'],'sha256':sha(p),'bundleExact':sha(p)==e['recordHash'],'logoMatches':record.get('logo')==e['logo'],'approved':bool(record.get('validated') and record.get('identityReview') in ['approved','passed'])})
 print(json.dumps({'approvedCount':len(entries),'exactBundleCount':sum(e['bundleExact'] for e in entries),'matchingLogoCount':sum(e['logoMatches'] for e in entries),'approvedRecordCount':sum(e['approved'] for e in entries),'entries':entries},indent=2))
elif mode=='compare':
 out=Path(extra[0]);old,new=dossiers(root),dossiers(out);changes=[];logo_changes=[]
 for i in sorted(old.keys()&new.keys()):
  a,b=old[i],new[i]
  if a['company'].get('logo')!=b['company'].get('logo'):logo_changes.append(i)
  a['company'].pop('logo',None);b['company'].pop('logo',None)
  if a!=b:changes.append({'id':i,'topLevelFields':[k for k in a.keys()|b.keys() if a.get(k)!=b.get(k)]})
 oldr,newr=rows(root),rows(out);index_changes=[]
 for i in sorted(oldr.keys()&newr.keys()):
  a,b=oldr[i],newr[i];a.pop('lg',None);b.pop('lg',None)
  if a!=b:index_changes.append(i)
 print(json.dumps({'baseline':coverage(root),'candidate':coverage(out),'dossierIdsAdded':sorted(new.keys()-old.keys()),'dossierIdsRemoved':sorted(old.keys()-new.keys()),'nonLogoDossierChanges':changes,'logoDossierChanges':logo_changes,'nonLogoIndexChanges':index_changes},indent=2))
else:raise SystemExit('Use records or compare')
