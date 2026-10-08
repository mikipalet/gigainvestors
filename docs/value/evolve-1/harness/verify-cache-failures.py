import hashlib,json,re,shutil
from pathlib import Path
r=Path('/Users/miki/data/value-evolve/.audit/evolve-1');e=r/'evidence';live=Path('/Users/miki/value-corpus')
source=json.loads((e/'source-baseline.json').read_text());text=(e/'analyze-candidate.log').read_text()
scope=json.loads((e/'full-nightly-scope.json').read_text());receipt=json.loads((e/'candidate-cache-receipt.json').read_text())
counts=[tuple(map(int,m))for m in re.findall(r'^analyze: (\d+) written, (\d+) unchanged, (\d+) failed$',text,re.M)]
assert len(counts)==4 and sum(sum(v)for v in counts)==scope['jobCount']==receipt['jobCount']
assert receipt['implementationUnchanged'] and receipt['disjoint']
summary={'jobs':scope['jobCount'],'written':sum(v[0]for v in counts),'unchanged':sum(v[1]for v in counts),'failed':sum(v[2]for v in counts),'cachedReadings':receipt['count'],'workers':4}
(e/'analysis-run-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
failures=re.findall(r'^analyze: (\S+): (.+)$',text,re.M);assert len(failures)==summary['failed'];rows=[];unexpected=[]
for id,reason in failures:
 if not reason.startswith('Cached reading unavailable or changed:'):unexpected.append({'id':id,'reason':reason});continue
 row={'id':id,'reason':reason,'retained':[],'absent':[]}
 for rel in [f'analysis/{id}.json',f'analysis/inputs/{id}.json',f'analysis/fingerprints/{id}.json']:
  p=r/'corpus'/rel;want=source.get(rel)
  if want:
   src=live/rel;assert hashlib.sha256(src.read_bytes()).hexdigest()==want
   if not p.exists()or hashlib.sha256(p.read_bytes()).hexdigest()!=want:shutil.copy2(src,p)
   assert hashlib.sha256(p.read_bytes()).hexdigest()==want
   row['retained'].append({'file':rel,'sha256':want})
  else:
   assert not p.exists(),rel;row['absent'].append(rel)
 rows.append(row)
(e/'retained-cache-failures.json').write_text(json.dumps(rows,indent=2)+'\n');(e/'unexpected-analysis-failures.json').write_text(json.dumps(unexpected,indent=2)+'\n')
print('Cache failures retained:',len(rows),'unexpected failures:',len(unexpected));assert not unexpected
