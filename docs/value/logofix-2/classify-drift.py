"""Classify existing logofix-1 ordinary replay; read-only, no publication."""
import json,pathlib,collections,datetime
root=pathlib.Path(__file__).resolve().parents[3];live=root/'corpus/publish-repo';out=root/'publish-out';corpus=root/'corpus';changes=[];counts=collections.Counter();examples={}
def diffs(a,b,p=''):
 if a==b:return []
 if isinstance(a,dict) and isinstance(b,dict):return sum((diffs(a.get(k),b.get(k),p+'.'+k if p else k) for k in sorted(a.keys()|b.keys())),[])
 return [{'path':p,'before':a,'after':b}]
for f in sorted((out/'dossiers').glob('[0-9][0-9][0-9].json')):
 old=json.loads((live/'dossiers'/f.name).read_text());new=json.loads(f.read_text())
 for i,a in old.items():
  if i not in new:continue
  d=[x for x in diffs(a,new[i]) if x['path']!='company.logo']
  if not d:continue
  changes.append({'id':i,'changes':d});counts.update(set(x['path'].split('.')[0] for x in d))
  for x in d:examples.setdefault(x['path'],{'id':i,**x})
result={'companies':len(changes),'fields':dict(counts),'paths':dict(collections.Counter(x['path'] for c in changes for x in c['changes'])),'changes':changes}
(root/'evidence-2/non-logo-drift-detail.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='changes'},indent=2))
for c in changes:
 if any(x['path'].split('.')[0] in ['valuation','series','tests'] for x in c['changes']):print(json.dumps(c,indent=2)[:10000])
for p,e in examples.items():
 if p.startswith('priceStory'):print(json.dumps(e,indent=2)[:5000])
