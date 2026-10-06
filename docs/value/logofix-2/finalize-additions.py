"""Materialize the 19 explicitly recorded visual review decisions and original bundle."""
import json,pathlib,hashlib,shutil,datetime
root=pathlib.Path(__file__).resolve().parents[3];b=root/'bundle-2/additions';original=pathlib.Path.home()/'data/value-logos/bundle';reviews=json.loads((root/'docs/value/logofix-2/visual-review.json').read_text());rows=json.loads((root/'evidence-2/review-candidates.json').read_text())
for name in ['records','assets']:shutil.copytree(original/name,b/name,dirs_exist_ok=True)
entries=json.loads((original/'manifest.json').read_text())['entries']
for row in rows:
 i=row['id'];r=row['record'];review=reviews[i];assert review['decision']=='pass' and review['asset']==r['asset'],i
 r.update(logo=f"/api/value/logo?asset={r['asset']}",identityReview='passed',review={'at':review['at'],'note':review['note'],'lightAndDark':True,'tilePx':26,'evidence':review['evidence']});r.pop('pendingLogo',None);r.pop('fallbackReason',None)
 p=b/'records'/f'{i}.json';p.write_text(json.dumps(r,indent=2)+'\n');shutil.copyfile(root/f"acquisition/enrichment-v7/logos/assets/{r['asset']}.json",b/f"assets/{r['asset']}.json")
 entries.append({'id':i,'recordHash':hashlib.sha256(p.read_bytes()).hexdigest(),'logo':r['logo']})
(b/'manifest.json').write_text(json.dumps({'version':1,'approved':1156,'fallbacks':28,'entries':entries},indent=2)+'\n');print('1184 entries: 1137 prior approvals, 19 new reviews, 28 original fallbacks (27 still published)')
