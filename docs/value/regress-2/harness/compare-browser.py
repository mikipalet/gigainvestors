import json,re
from pathlib import Path
r=Path('/Users/miki/data/regress/run2/evidence');live=json.loads((r/'browser-live/report.json').read_text());candidate=json.loads((r/'browser/report.json').read_text());prior=json.loads(Path('docs/value/regress-1/browser-summary.json').read_text());owner=json.loads(Path('docs/value/dedupe-1/browser-report.json').read_text())
allowed={i for row in owner for i in row.get('issues',[])if i.startswith('text below 13px:')and i.endswith('(12px)')}
def state(r):return (r['path'],r['state'].split(':')[0]if r['state'].startswith('Price story:')else r['state'],r['width'],r['height'])
lookup={state(row):set(row.get('issues',[]))for row in live}
findings=[];new=[];counts={'ownerChrome':0,'ownerWhitespace':0,'preExisting':0}
for row in candidate:
 for issue in row.get('issues',[]):
  finding={k:row[k]for k in ['path','state','width','height','file']};finding['issue']=issue
  if issue in allowed:disposition='ownerChrome'
  elif issue.startswith(('bottom empty area ','empty block ','raster empty area ')):disposition='ownerWhitespace'
  elif issue in lookup.get(state(row),set()):disposition='preExisting'
  else:disposition='new';new.append(finding)
  finding['disposition']=disposition;findings.append(finding)
  if disposition in counts:counts[disposition]+=1
# The original 42 are independently listed, even when the final fix removes them.
original=[]
for row in prior['blockingFindings']:
 issues=lookup.get(state(row),set());exact=row['issue']in issues
 normalized=lambda s:re.sub(r'"20\d{2}"','"FY"',s)
 sameLabels=any(normalized(row['issue'])==normalized(i)for i in issues)
 disposition='pre-existing: exact live finding'if exact else 'pre-existing: same year/caption collision, changed fiscal-year label'if sameLabels else 'changed chart/year combination: fixed; related collision exists on live'if issues else 'new addition: caption spacing fixed'
 original.append({**row,'disposition':disposition,'liveIssues':sorted(issues)if not exact else [row['issue']]})
summary={'candidateStates':len(candidate),'liveStates':len(live),'companies':sorted({r['path']for r in candidate}),'viewports':sorted({f"{r['width']}x{r['height']}"for r in candidate}),'rawFailedStates':sum(bool(r.get('issues'))for r in candidate),'counts':counts,'newFindings':new,'original42':original,'findings':findings,'pass':not new}
(r/'browser-comparison.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items()if k not in ['findings','original42']},indent=2));assert not new,'New browser findings remain'
