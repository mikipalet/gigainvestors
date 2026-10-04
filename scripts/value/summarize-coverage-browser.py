"""Compare identical unmodified release-gate thresholds on fixed samples."""
import json
from pathlib import Path
root=Path.home()/'data/value-cover/held-validation'
out=Path('docs/value/held-coverage-evidence/cover-3/browser-comparison.json')
whitespace=lambda issue: issue.startswith(('bottom empty area ','raster empty area ','empty block '))
def kind(state):
    if state.startswith('Price story:'):return 'Price story'
    if state.startswith('Risk note:'):return 'Risk note'
    if state.startswith('Open all '):return 'Holders'
    if state in ['In depth ↗','More ↗']:return 'Business detail'
    return state
summary={}
for group in ['baseline','additions']:
    states=json.loads((root/f'cover-3-{group}-60/report.json').read_text())
    drawers=[s for s in states if 'emptyAreaPct' in s]
    failures=[s for s in drawers if any(whitespace(i) for i in s['issues'])]
    paths={s['path'] for s in states}
    summary[group]={'companies':len(paths),'states':len(states),'drawers':len(drawers),'whitespaceFailedDrawers':len(failures),'whitespaceRate':len(failures)/len(drawers) if drawers else None,
        'companyWhitespaceFailures':len({s['path'] for s in failures}),
        'nonWhitespaceFailures':[{'path':s['path'],'width':s['width'],'state':s['state'],'issues':[i for i in s['issues'] if not whitespace(i)]} for s in states if any(not whitespace(i) for i in s['issues'])],
        'byViewport':{str(w):{'drawers':len([s for s in drawers if s['width']==w]),'whitespaceFailures':len([s for s in failures if s['width']==w])} for w in [1728,390]},
        'meanCompanyWhitespaceRate':sum(sum(s in failures for s in drawers if s['path']==p)/sum(s['path']==p for s in drawers) for p in paths)/len(paths),
        'byDrawer':{name:{'states':len([s for s in drawers if kind(s['state'])==name]),'failed':len([s for s in failures if kind(s['state'])==name])} for name in sorted({kind(s['state']) for s in drawers})}}
summary['percentagePointDifference']=100*(summary['additions']['whitespaceRate']-summary['baseline']['whitespaceRate'])
summary['seed']=202610043
summary['materialityMarginPercentagePoints']=10
summary['materiallyWorse']=summary['percentagePointDifference']>10
out.write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:{kk:vv for kk,vv in v.items() if kk not in ['nonWhitespaceFailures','byDrawer']} if isinstance(v,dict) else v for k,v in summary.items()}))
