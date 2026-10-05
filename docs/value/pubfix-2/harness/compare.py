import os,json,hashlib,copy
from pathlib import Path
root=Path(os.environ['PUBFIX_ROOT']); base=root/'baseline'; out=root/'corpus/publish-repo'; dry=root/'dry-run'
def read(p):return json.loads(p.read_text())
def dossiers(p):return {k:v for f in sorted((p/'dossiers').glob('*.json')) for k,v in read(f).items()}
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def differences(a,b,p=''):
 if a==b:return []
 if isinstance(a,dict) and isinstance(b,dict):
  result=[]
  for k in sorted(a.keys()|b.keys()):
   if k not in a or k not in b:result.append({'path':p+'.'+k,'before':a.get(k),'after':b.get(k),'beforePresent':k in a,'afterPresent':k in b})
   else:result.extend(differences(a[k],b[k],p+'.'+k))
  return result
 if isinstance(a,list) and isinstance(b,list) and len(a)==len(b):
  return [d for i,(x,y) in enumerate(zip(a,b)) for d in differences(x,y,p+f'[{i}]')]
 return [{'path':p,'before':a,'after':b}]
before,after,expected=map(dossiers,[base,out,dry]);aliases=read(out/'aliases.json')
removed=sorted(before.keys()-after.keys());added=sorted(after.keys()-before.keys())
freeze=read(root/'corpus/verdict-freeze.json')['ids']
new_logos=[i for i in after if not before[i]['company'].get('logo') and after[i]['company'].get('logo')]
retired_logos=[]
for i in removed:
 cache=root/f'corpus/enrichment-v7/logos/{i}.json'
 logo=read(cache) if cache.exists() else {}
 if not before[i]['company'].get('logo') and logo.get('validated') and logo.get('asset') and logo.get('identityReview') not in ['pending','rejected']:retired_logos.append(i)
financial=[];changed=[]
for i in sorted(after):
 diff=differences(before[i],after[i])
 if diff:changed.append({'id':i,'changes':diff})
 relevant=[d for d in diff if d['path'] not in ['.company.logo','.priceStory.asOf']]
 if relevant:financial.append({'id':i,'changes':relevant})
# Compare exact before/after payloads with the checked-in drift investigation.
reference={r['id']:{x['path']:x for x in r['changes']} for r in read(Path('docs/value/drift-1/fixed-differences.json'))}
documented_cases={i for i,changes in reference.items() if i in after and any(p!='.priceStory.asOf' for p in changes)}
frozen_cases=sorted(documented_cases&set(freeze))
unexplained=[{'id':r['id'],**d} for r in financial for d in r['changes'] if reference.get(r['id'],{}).get(d['path'])!=d]
# The dry run and real path should emit the same parsed public payloads.
file_mismatches=[];byte_mismatches=[]
for f in dry.rglob('*.json'):
 rel=f.relative_to(dry);g=out/rel
 if not g.exists() or read(f)!=read(g):file_mismatches.append(str(rel))
 if not g.exists() or digest(f)!=digest(g):byte_mismatches.append(str(rel))
frozen_financial=[]
for i in freeze:
 a=copy.deepcopy(before[i]);b=copy.deepcopy(after[i]);a['company'].pop('logo',None);b['company'].pop('logo',None)
 if a!=b:frozen_financial.append(i)
proof={'baselineCount':len(before),'dossiers':len(after),'retiredCount':len(removed),'retiredAliases':{i:aliases.get(i) for i in removed},'unexpectedAdded':added,'newSurvivingLogos':len(new_logos),'newRetiredLogos':len(retired_logos),'approvedLogoAdditionsBeforeRetirement':len(new_logos)+len(retired_logos),'retiredLogoIds':retired_logos,'documentedCanonicalDriftCases':len(documented_cases),'frozenDriftCases':frozen_cases,'appliedDriftCompanies':len(financial),'driftIds':[r['id'] for r in financial],'unexplainedChanges':unexplained,'freezeCount':len(freeze),'freezeFinancialChanges':frozen_financial,'FRFHF_frozen':'FRFHF.US' in freeze,'FRFHF_exact':before['FRFHF.US']==after['FRFHF.US'],'dryRunDossierEquality':after==expected,'dryRunFileMismatches':file_mismatches,'dryRunByteMismatches':byte_mismatches}
(root/'evidence/comparison.json').write_text(json.dumps(proof,indent=2)+'\n')
(root/'evidence/dossier-changes.json').write_text(json.dumps(changed,indent=2)+'\n')
print(json.dumps({k:v for k,v in proof.items() if k!='retiredAliases'},indent=2))
assert len(after)==3899 and len(removed)==58 and not added
assert all(aliases.get(i) in after and aliases[i] not in aliases for i in removed)
assert len(new_logos)+len(retired_logos)==1137 and len(documented_cases)==23
assert {r['id'] for r in financial}==documented_cases-set(freeze) and frozen_cases==['FRFHF.US'] and not unexplained
assert len(freeze)==148 and not frozen_financial and proof['FRFHF_frozen']
assert after==expected and not file_mismatches
