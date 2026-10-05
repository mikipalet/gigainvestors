#!/usr/bin/env python3
# Read-only candidate discovery. Review stale identifiers before accepting groups.
import json,pathlib,collections,hashlib,re
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--corpus',required=True);parser.add_argument('--out',required=True);args=parser.parse_args()
p=pathlib.Path(args.corpus);out=pathlib.Path(args.out);out.mkdir(parents=True,exist_ok=True)
ds={k:v for f in (p/'publish-repo/dossiers').glob('*.json') for k,v in json.loads(f.read_text()).items()}
raw={}; evidence=collections.defaultdict(list); keys=collections.defaultdict(set)
for f in (p/'raw/eodhd').glob('*.json'):
 try:
  g=json.loads(f.read_text()).get('General',{})
  if not g:continue
  raw[f.stem]=g
 except:pass
parents={id:id for id in raw|ds}
def root(a):
 while parents[a]!=a:parents[a]=parents[parents[a]];a=parents[a]
 return a
def join(a,b,k):
 if a not in parents or b not in parents:return
 if a!=b:evidence[tuple(sorted((a,b)))].append(k)
 parents[root(b)]=root(a)
for id,g in raw.items():
 for k in ['ISIN','LEI','CIK','OpenFigi']:
  v=g.get(k)
  if v and str(v).lower() not in ['none','null','na','n/a','0','0000000000']:
   if k=='CIK':v=str(int(v)) if str(v).isdigit() else v
   keys[(k,v)].add(id)
 for listing in [g.get('PrimaryTicker')]+[f"{r.get('Code')}.{r.get('Exchange')}" for r in (g.get('Listings') or {}).values()]:
  if listing:join(id,listing,'vendor listing/primary')
for (k,v),ids in keys.items():
 for id in ids:join(sorted(ids)[0],id,f'{k}:{v}')
groups=collections.defaultdict(list)
for id in ds:groups[root(id)].append(id)
result=[]
for r,ids in groups.items():
 if len(ids)<2:continue
 nodes=[id for id in raw if root(id)==r]
 result.append({'ids':sorted(ids),'evidence':[{'a':a,'b':b,'keys':ks} for (a,b),ks in evidence.items() if a in nodes and b in nodes], 'nodes':nodes})
(out/'identity-graph.json').write_text(json.dumps(result,indent=2))
(out/'identity-records.json').write_text(json.dumps({id:{k:g.get(k) for k in ['Name','ISIN','LEI','CIK','OpenFigi','PrimaryTicker','Listings','WebURL']} for id,g in raw.items()},indent=2))
freeze=set(json.loads((p/'verdict-freeze.json').read_text())['ids']); membership=json.loads((p/'index-membership/latest.json').read_text())['memberships']
print('dossiers',len(ds),'raw',len(raw),'groups',len(result),'extra',sum(len(r['ids'])-1 for r in result))
for group in sorted(result,key=lambda g:g['ids']):
 print(' | '.join(f"{id} {ds[id]['company']['name']} ({'FREEZE ' if id in freeze else ''}{','.join(membership.get(id,[]))})" for id in group['ids']))
# candidates for investigation only; never identity joins
names=collections.defaultdict(list)
for id,d in ds.items():
 n=d['company']['name'].lower();n=re.sub(r'\b(holdings?|group|corporation|corp|company|co|inc|ltd|limited|plc|sa|adr|ab|se|ag|a|b|class)\b','',n);n=re.sub(r'[^a-z0-9]','',n)
 if n:names[n].append(id)
print('UNLINKED NAME CANDIDATES')
for n,ids in names.items():
 if len(set(root(id) for id in ids))>1:print(ids, [ds[id]['company']['name'] for id in ids])

# Broader candidate discovery never creates identity edges. Review against legal
# identifiers/depositary documentation before adding anything to the registry.
import urllib.parse
candidate_keys=collections.defaultdict(set)
for id,d in ds.items():
 g=raw.get(id,{})
 url=g.get('WebURL')
 if url:
  host=urllib.parse.urlparse(url).netloc.removeprefix('www.').removeprefix('ir.')
  candidate_keys['website:'+host].add(id)
 isin=g.get('ISIN') or d['company'].get('isin')
 if isin and isin[:2] in ['US','CA']:candidate_keys['NSIN-issuer:'+isin[:8]].add(id)
 for listing in [id]+d['company'].get('listings',[]):candidate_keys['listing:'+listing].add(id)
 for field in ['cik','lei','edinetCode']:
  if d['company'].get(field):candidate_keys[field+':'+str(d['company'][field])].add(id)
registry=json.loads((pathlib.Path(__file__).resolve().parents[2]/'lib/value/issuer-registry.json').read_text())
accepted={id:g['canonical'] for g in registry['groups'] for id in g['ids']}
rejected={tuple(sorted((accepted.get(a,a),accepted.get(b,b)))) for g in registry['rejected'] for a in g['ids'] for b in g['ids'] if a!=b}
candidates=[]
for key,ids in sorted(candidate_keys.items()):
 if len(ids)<2:continue
 pairs=[(a,b) for a in sorted(ids) for b in sorted(ids) if a<b]
 unresolved=[(a,b) for a,b in pairs if accepted.get(a,a)!=accepted.get(b,b) and tuple(sorted((accepted.get(a,a),accepted.get(b,b)))) not in rejected]
 candidates.append({'key':key,'ids':sorted(ids),'unresolved':unresolved})
coverage={id:{'raw':id in raw,'isin':raw.get(id,{}).get('ISIN') or d['company'].get('isin'),'lei':raw.get(id,{}).get('LEI') or d['company'].get('lei'),'cik':raw.get(id,{}).get('CIK') or d['company'].get('cik'),'edinet':d['company'].get('edinetCode'),'reviewedIssuer':accepted.get(id)} for id,d in ds.items()}
(out/'audit-coverage.json').write_text(json.dumps({'published':len(ds),'vendorRecords':len(raw),'candidateSignals':candidates,'coverage':coverage},indent=2))
print('UNRESOLVED SIGNALS', [c for c in candidates if c['unresolved']])
