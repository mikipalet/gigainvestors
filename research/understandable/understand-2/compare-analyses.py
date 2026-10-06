"""Compare the full completed nightly analysis cohorts without bypassing publication."""
from pathlib import Path
import json,gzip,hashlib
root=Path(__file__).resolve().parents[3];work=root/'.audit/understand-2';out=root/'research/understandable/outputs/understand-2';new=root/'.audit/understandable/corpus/analysis'
ids=json.load(open(work/'published-ids.json'));expected={r['id'] for r in json.load(open(root/'research/understandable/outputs/current-screen.json'))['changes']}
def compare(old,name):
 changes=[];valuations=[];quality=[];manifest={};rows=[]
 for i in ids:
  af,bf=old/(i+'.json'),new/(i+'.json');a,b=json.load(open(af)),json.load(open(bf))
  manifest[i]={'before':hashlib.file_digest(af.open('rb'),'sha256').hexdigest(),'after':hashlib.file_digest(bf.open('rb'),'sha256').hexdigest()}
  av={k:t['result'] for k,t in a['tests'].items()};bv={k:t['result'] for k,t in b['tests'].items()}
  rows.append({'id':i,'before':av,'after':bv})
  for k in av:
   if av[k]!=bv[k]:changes.append({'id':i,'test':k,'before':av[k],'after':bv[k]})
  if a['valuation']!=b['valuation']:valuations.append(i)
  x=all(v=='pass' for v in av.values());y=all(v=='pass' for v in bv.values())
  if x!=y:quality.append({'id':i,'before':x,'after':y})
 unexpected=[r for r in changes if r['id'] not in expected or r['test']!='understandable' or r['before']!='fail' or r['after']!='pass']
 result={'compared':len(ids),'verdictChanges':changes,'unexpectedVerdictChanges':unexpected,'missingExpectedIds':sorted(expected-{r['id'] for r in changes if r['test']=='understandable'}),'valuationChanges':valuations,'qualityPassChanges':quality}
 (out/(name+'.json')).write_text(json.dumps(result,indent=2)+'\n')
 with gzip.open(out/(name+'-verdicts-and-hashes.json.gz'),'wt') as f:json.dump({'hashes':manifest,'verdicts':rows},f,separators=(',',':'))
 print(name,'verdict changes',len(changes),'unexpected',len(unexpected),'valuation changes',len(valuations),'quality changes',len(quality),flush=True)
compare(work/'master-analysis','nightly-analysis-method-diff')
compare(work/'original-analysis','original-to-nightly-analysis')
