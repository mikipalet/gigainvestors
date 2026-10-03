import json,pathlib,collections
r=pathlib.Path(__file__).resolve().parent;c=r/'corpus'
universe=[json.loads(s) for s in (c/'universe.jsonl').read_text().splitlines() if s.strip()]
jobs={x['id']:x for x in universe if (c/'fundamentals'/f"{x['id']}.json").exists()}
members=json.loads((c/'index-membership/latest.json').read_text())['memberships']
versions=collections.Counter();missing=[];fingerprints=[];snapshots=[];empty=[]
for id,x in jobs.items():
 p=c/'analysis'/f'{id}.json'
 if not p.exists():missing.append(id);continue
 a=json.loads(p.read_text());versions[str(a.get('versions',{}).get('pipeline'))]+=1
 if not (c/'analysis/fingerprints'/f'{id}.json').exists():fingerprints.append(id)
 if members.get(id):
  p=c/'analysis/inputs'/f'{id}.json';i=json.loads(p.read_text()) if p.exists() else {}
  if not isinstance(i.get('memoYears'),list) or i.get('asOf')!=a.get('asOf'):snapshots.append(id)
  elif not i['memoYears']:empty.append({'id':id,'status':a['status']})
result={'jobs':len(jobs),'versions':dict(versions),'missingAnalysis':missing,'missingFingerprints':fingerprints,'missingOrStaleMemberSnapshots':snapshots,'emptyMemberSnapshots':empty}
(r/'analysis-coverage.json').write_text(json.dumps(result,indent=2)+'\n');print(result)
