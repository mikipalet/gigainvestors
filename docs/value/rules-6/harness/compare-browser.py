import json,re
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-6/evidence');live=json.loads((r/'browser-live/report.json').read_text());candidate=json.loads((r/'browser/report.json').read_text());owner=json.loads(Path('docs/value/dedupe-1/browser-report.json').read_text())
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
summary={'candidateStates':len(candidate),'liveStates':len(live),'companies':sorted({r['path']for r in candidate}),'viewports':sorted({f"{r['width']}x{r['height']}"for r in candidate}),'rawFailedStates':sum(bool(r.get('issues'))for r in candidate),'counts':counts,'newFindings':new,'findings':findings,'pass':not new}
(r/'browser-comparison.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items()if k not in ['findings']},indent=2));assert not new,'New browser findings remain'
assert len(candidate)>=90 and len(live)>=90,'Incomplete browser coverage'
assert not any(v['state']=='interaction failure'for v in candidate+live),'Browser interactions must complete'
assert len({(v['path'],v['width'],v['height'])for v in candidate})==10
# Keep every strict result. Complete both quality tests and price even when a
# prior discrepancy is found; compare complete archived data, not just wording.
dom={arm:{(v['id'],v['width']):v for v in json.loads((r/f'price-dom-{arm}.json').read_text())}for arm in ['live','candidate']}
assert all(len(v)==10 and all(x['passed']for x in v.values())for v in dom.values())
semantic={arm:json.loads((r/f'semantics-{arm}/semantics.json').read_text())for arm in ['live','candidate']}
lookup={(v['id'],v['width']):v for v in semantic['live']};legacy=[];fresh=[]
for row in semantic['candidate']:
 old=lookup[(row['id'],row['width'])]
 assert len(row.get('tests',[]))==3 and len(old.get('tests',[]))==3,'Quality surface audit incomplete'
 if row.get('error'):fresh.append({'id':row['id'],'width':row['width'],'error':row['error']});continue
 for test in row['tests']:
  if test['pass']:continue
  previous=next(t for t in old['tests']if t['key']==test['key'])
  if test.get('error')==previous.get('error') and re.search(r' published \w+ FY\d+',test.get('error','')) and test['sharedSeriesConflicts'] and test['sharedSeriesConflicts']==previous['sharedSeriesConflicts']:
   legacy.append({'id':row['id'],'width':row['width'],'scope':test['key'],'error':test['error'],'conflicts':test['sharedSeriesConflicts'],'reason':'All conflicting test/dossier fiscal observations match live exactly; preserve dated observations under R1/R4, classify under R5'})
  else:fresh.append({'id':row['id'],'width':row['width'],'scope':test['key'],'error':test.get('error')})
 if row['price'].get('pass')or row['price'].get('absent'):continue
 hidden=lambda v:bool(v.get('hiddenMath'))and all(x['display']=='none'and not x['visible']for x in v['hiddenMath'])
 error=row['price'].get('error','');prior=old['price'].get('error','')
 shape=lambda text:re.sub(r'expected .*$', 'expected <bound model amount>',text)
 if hidden(row)and hidden(old)and shape(error)==shape(prior) and ' price math: expected 'in error and all(dom[arm][(row['id'],row['width'])]['passed']for arm in ['live','candidate']):legacy.append({'id':row['id'],'width':row['width'],'scope':'price','error':error,'liveError':prior,'reason':'Same intentionally hidden .valuation-math table; differing expected amounts match each arm’s bound model. Full unchanged arithmetic auditor passes using actual DOM text, including visible header/drawer, all key numbers, annual table and chart observations.'})
 else:fresh.append({'id':row['id'],'width':row['width'],'scope':'price','error':error})
assert len(semantic['candidate'])==len(semantic['live'])==10
summary.update({'semanticStates':10,'fullPriceDomAudits':20,'qualitySurfaceAudits':30,'priceSurfaceAudits':10,'legacySemanticFindings':legacy,'newSemanticFindings':fresh,'pass':not new and not fresh})
(r/'browser-comparison.json').write_text(json.dumps(summary,indent=2)+'\n')
print('Semantic states:',10,'unchanged legacy findings:',len(legacy),'new findings:',len(fresh));assert not fresh
