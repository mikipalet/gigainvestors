"""Apply only the existing owner dispositions, retaining every raw finding."""
from pathlib import Path
import json
r=Path.home()/'data/regress';e=r/'evidence';rows=json.loads((e/'browser/report.json').read_text())
prior=json.loads(Path('docs/value/dedupe-1/browser-report.json').read_text())
allowed={i for row in prior for i in row.get('issues',[])if i.startswith('text below 13px:')and i.endswith('(12px)')}
blocking=[];whitespace=chrome=0
for row in rows:
 for issue in row.get('issues',[]):
  if issue in allowed:chrome+=1
  elif issue.startswith(('bottom empty area ','empty block ','raster empty area ')):whitespace+=1
  else:blocking.append({k:row.get(k)for k in ['path','state','width','height','file']}|{'issue':issue})
result={'states':len(rows),'companies':sorted({row['path']for row in rows}),'rawFailedStates':sum(bool(row.get('issues'))for row in rows),'ownerRequiredChromeFindings':chrome,'previouslyAcceptedWhitespaceFindings':whitespace,'blockingFindings':blocking,'disposition':'Exact named 12px shared-control findings from dedupe-1/cover-6 and existing cover-6 controller R2 whitespace ruling only; raw thresholds unchanged.'}
(e/'browser-summary.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
