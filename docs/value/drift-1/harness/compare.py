"""Exact field attribution; never changes a corpus or normalizes the proof inputs."""
from pathlib import Path
import collections, hashlib, json, sys
root=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
fixed_dir=root/(sys.argv[3] if len(sys.argv)>3 else 'fixed')
corpus=root/'corpus';source=Path('/Users/miki/data/value-cover')
corrections=json.loads((root/'corrections.json').read_text())['results']
upstream=json.loads(Path('/Users/miki/GitHub/superinvestors-wt/value-cover/docs/value/dedupe-2/upstream-control.json').read_text())
share_ids=set(json.loads((root/'share-control-inputs.json').read_text())['removedScheduledShareChecks'])

def read(p):return json.loads(p.read_text()) if p.exists() else None

def diff(a,b,p=''):
 if a==b:return []
 if isinstance(a,dict) and isinstance(b,dict):
  result=[]
  for k in sorted(a.keys()|b.keys()):
   if k not in a or k not in b:result.append({'path':p+'.'+k,'before':a.get(k),'after':b.get(k),'beforePresent':k in a,'afterPresent':k in b})
   else:result.extend(diff(a[k],b[k],p+'.'+k))
  return result
 if isinstance(a,list) and isinstance(b,list) and len(a)==len(b):
  return [d for i,(x,y) in enumerate(zip(a,b)) for d in diff(x,y,p+f'[{i}]')]
 return [{'path':p,'before':a,'after':b}]

def dump(name,v):(out/name).write_text(json.dumps(v,indent=2,ensure_ascii=False)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def evidence(rel):
 p=corpus/rel
 return {'path':str(p),'sha256':sha(p)} if p.exists() else {'path':str(p),'absent':True}
quotes={}
for f in (corpus/'publish-repo/prices').glob('*.json'):quotes.update(read(f))
rows=[];fixed_changes=[];control_changes=[];count=0;missing=[];unexpected=[];failures=[];same=0
for file in sorted((corpus/'publish-repo/dossiers').glob('*.json')):
 live=read(file);ordinary=read(root/'ordinary/dossiers'/file.name) or {};fixed=read(fixed_dir/'dossiers'/file.name) or {};control=read(root/'share-control/dossiers'/file.name) or {}
 for id,a in live.items():
  count+=1
  if id not in ordinary or id not in fixed or id not in control:missing.append(id);continue
  changes=diff(a,ordinary[id]);fc=diff(a,fixed[id]);cc=diff(a,control[id]);
  if not fc:same+=1
  if fc:fixed_changes.append({'id':id,'changes':fc})
  if cc:control_changes.append({'id':id,'changes':cc})
  if not changes:continue
  inputs=read(corpus/f'analysis/inputs/{id}.json');analysis=read(corpus/f'analysis/{id}.json')
  paths=[f'analysis/{id}.json',f'analysis/inputs/{id}.json',f'completeness/verified/{id}.json',f'raw/sec-annual/{id}.json',f'raw/annual-reviewed/{id}.json',f'raw/sec-companyfacts/{id}.json',f'prices-history/{id}.json',f'prices-history/meta/{id}.json',f'enrichment-v7/share-checks/{id}.json',f'price-story/readings/{id}.json']
  share=read(corpus/f'enrichment-v7/share-checks/{id}.json')
  row={'id':id,'liveShard':str(file),'analysisAsOf':analysis['asOf'],'inputBinding':inputs['asOf']==analysis['asOf'],'analysisMatchesReviewedCoverage':sha(corpus/f'analysis/{id}.json')==sha(source/f'analysis/{id}.json'),'memoInputsMatchReviewedCoverage':sha(corpus/f'analysis/inputs/{id}.json')==sha(source/f'analysis/inputs/{id}.json'),'quote':quotes.get(id),'liveStoryPriceDate':a.get('priceStory',{}).get('priceDate'),'ordinaryStoryPriceDate':ordinary[id].get('priceStory',{}).get('priceDate'),'evidence':[evidence(p) for p in paths],'correctionRecords':[x for x in corrections if x['id']==id],'shareCheck':share,'changes':changes}
  for c in changes:
   p=c['path']
   if p=='.priceStory.asOf':
    cause='publication-time';refs=['scripts/value/stages/publish.ts:loadAnalyses','lib/value/price-story/compose.ts:composePriceStory'];proof='Fresh publication clock; underlying analysis asOf and reviewed input hashes unchanged.'
   elif p.startswith('.priceHistory'):
    cause='defect-raw-history-replaces-split-adjusted';refs=[f'prices-history/{id}.json',f'prices-history/meta/{id}.json','lib/value/price-history.ts:fetchPriceHistory',f'/Users/miki/data/value-cover/held-validation/cover-4/raw/{id}-yahoo-1mo.json'];proof='Fixed ordinary output has exact live priceHistory; old EOD monthly raw close differs from reviewed Yahoo split-adjusted close.'
    if fixed[id].get('priceHistory')!=a.get('priceHistory'):failures.append([id,p,'history not restored'])
   elif (id in ['AESI.US','NOG.US'] and p.startswith(('.ownerMemo','.priceStory'))) or (id=='AVBH.US' and p=='.priceStory.priceDate'):
    cause='fresh-close';refs=[f'publish-repo/prices/{a["company"]["country"]}.json',f'prices/{a["company"]["country"]}.json','lib/value/owner-memo.ts:memoAtPrice','lib/value/price-story/compose.ts:composePriceStory'];proof='Quote advanced from 2026-09-29 to 2026-10-02; statement values unchanged.'
   elif id in share_ids and p.startswith(('.valuation','.valueHistory','.tests.price','.ownerMemo','.priceStory','.b')):
    cause='scheduled-independent-share-check';refs=[f'enrichment-v7/share-checks/{id}.json','scripts/value/run-daily.sh:share-checks','lib/value/share-check.ts:applyShareCheck','lib/value/public-analysis.ts:publicAnalysis'];proof='Removing only the new check restores the live fields, apart from the independently identified current-close changes and publication clock.'
    bad=[c for c in cc if c['path']!='.priceStory.asOf' and not(id=='AVBH.US' and c['path'] in ['.ownerMemo.lines[3].evidence[0].quote','.priceStory.priceDate'])]
    if id=='AVBH.US' and p=='.ownerMemo.lines[3].evidence[0].quote':
     cause='scheduled-share-check-and-fresh-close';refs.append('publish-repo/prices/US.json');c['withoutNewShareCheck']=next(x['after'] for x in cc if x['path']==p)
    if bad:failures.append([id,p,'share control not exact',bad])
   else:
    cause='UNCLASSIFIED';refs=[];proof='';failures.append([id,p,'unclassified'])
   c.update(cause=cause,evidence=refs,proof=proof)
  if not row['inputBinding'] or not row['analysisMatchesReviewedCoverage'] or not row['memoInputsMatchReviewedCoverage']:failures.append([id,'lost reviewed analysis/input'])
  rows.append(row)
 # No membership changes may be hidden by iterating the baseline.
 unexpected.extend(sorted((ordinary.keys()|fixed.keys()|control.keys())-live.keys()))
if set(x['id'] for x in rows)!=set(upstream['upstreamChanged']):failures.append('changed IDs differ from dedupe-2')
for row in control_changes:
 for c in row['changes']:
  if c['path']!='.priceStory.asOf' and not(row['id'] in ['AESI.US','NOG.US','AVBH.US'] and c['path'].startswith(('.ownerMemo','.priceStory'))):failures.append(['control residual',row['id'],c])
# Fixed differences must be exactly the classified original differences (excluding history),
# allowing only the fresh rendering timestamp to vary in value.
byid={x['id']:x for x in rows}
for row in fixed_changes:
 allowed={c['path']:c for c in byid[row['id']]['changes'] if c['cause']!='defect-raw-history-replaces-split-adjusted'} if row['id'] in byid else {}
 for c in row['changes']:
  if c['path'] not in allowed or (c['path']!='.priceStory.asOf' and c['after']!=allowed[c['path']]['after']):failures.append(['unexpected fixed delta',row['id'],c])
summary={'dossiers':count,'unchangedDossiers':same,'ordinaryChangedDossiers':len(rows),'fixedChangedDossiers':len(fixed_changes),'shareControlChangedDossiers':len(control_changes),'missing':missing,'unexpected':unexpected,'changedFieldsByCause':dict(collections.Counter(c['cause'] for r in rows for c in r['changes'])),'dossiersByCause':{cause:[r['id'] for r in rows if any(c['cause']==cause for c in r['changes'])] for cause in sorted(set(c['cause'] for r in rows for c in r['changes']))},'failures':failures}
dump('field-attribution.json',rows);dump('proof.json',summary);dump('fixed-differences.json',fixed_changes);dump('share-control-differences.json',control_changes)
print(json.dumps({k:v for k,v in summary.items() if k!='dossiersByCause'},indent=2))
assert count==3957 and not missing and not unexpected and not failures
