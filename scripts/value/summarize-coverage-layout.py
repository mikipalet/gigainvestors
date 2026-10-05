"""Retain raw QA findings; separate the owner's required 12px chrome explicitly."""
import json,re,sys
from pathlib import Path
source,destination=sys.argv[1:]
rows=json.loads(Path(source).read_text())
# The owner explicitly requires master's original compact controls. Do not change
# the release gate's 13px threshold or classify any other small text as exempt.
chrome=re.compile(r'^text below 13px: "(?:GigaInvestors|GigaValue|Search|/|Method|Newsletter|Agent API|Contact|In depth|More|↗|Close|×)" \(12px\)$')
summary={'source':source,'states':len(rows),'companies':sorted({r['path'] for r in rows}),'viewports':sorted({f"{r['width']}x{r['height']}" for r in rows}),'rawFailedStates':sum(bool(r['issues']) for r in rows),'whitespaceFindings':0,'ownerRequiredChromeFindings':0,'blockingFindings':[],'chromeDisposition':'Explicit cover-6 owner instruction: controls remain exactly as master, 12px compact. Raw gate and threshold unchanged.','whitespaceDisposition':'Prior controller R2 nonblocking ruling retained. Raw gate and thresholds unchanged.'}
for row in rows:
 for issue in row['issues']:
  if issue.startswith(('bottom empty area ','raster empty area ','empty block ')):summary['whitespaceFindings']+=1
  elif chrome.fullmatch(issue):summary['ownerRequiredChromeFindings']+=1
  else:summary['blockingFindings'].append({key:row[key] for key in ['path','width','height','state']}|{'issue':issue})
Path(destination).write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k not in ['blockingFindings','chromeDisposition','whitespaceDisposition']}|{'blockingCount':len(summary['blockingFindings'])}))
