from pathlib import Path
import json,re
p=Path('docs/value/dedupe-2');source=Path('/Users/miki/data/value-dedupe-2/browser-gate/report.json');rows=json.loads(source.read_text());(p/'browser-report.json').write_text(source.read_text())
prior=json.loads(Path('docs/value/dedupe-1/browser-report.json').read_text())
allowed=set(i for r in prior for i in r.get('issues',[]) if i.startswith('text below 13px:') and i.endswith('(12px)'))
blocking=[];whitespace=chrome=0
for row in rows:
 for issue in row.get('issues',[]):
  if issue in allowed:chrome+=1
  elif issue.startswith(('bottom empty area ', 'empty block ', 'raster empty area ')):whitespace+=1
  else:blocking.append({'path':row.get('path'),'state':row.get('state'),'issue':issue})
result={'source':str(source),'states':len(rows),'companies':sorted(set(r['path'] for r in rows)),'rawFailedStates':sum(bool(r.get('issues')) for r in rows),'whitespaceFindings':whitespace,'ownerRequiredChromeFindings':chrome,'blockingFindings':blocking,'chromeDisposition':'Exact named 12px shared-control findings from dedupe-1 and cover-6 only; raw thresholds unchanged.','whitespaceDisposition':'Existing cover-6 controller R2 ruling retained; raw findings preserved.'}
(p/'browser-summary.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));assert not blocking
