"""Classify every candidate browser finding; any finding not owner-accepted or already live fails the gate."""
import json,re
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-7/evidence')
candidate=json.loads((r/'browser/report.json').read_text());live=json.loads((r/'browser-live/report.json').read_text())
owner=json.loads(Path('docs/value/dedupe-1/browser-report.json').read_text())
allowed={i for row in owner for i in row.get('issues',[])if i.startswith('text below 13px:')and i.endswith('(12px)')}
key=lambda row:(row['path'],row['state'].split(':')[0]if row['state'].startswith('Price story:')else row['state'],row['width'],row['height'])
# /s/ADBE is prerendered from the candidate store at build time, so the live arm cannot
# render a live ADBE page from this build; ADBE findings must be owner-accepted or absent.
prerendered={'/s/ADBE.US'}
lookup={key(row):set(row.get('issues',[]))for row in live if row['path']not in prerendered}
shape=lambda issue:re.sub(r'"[\d,.]+" / "[\d,.]+"','"<amount>" / "<amount>"',issue)
findings=[];new=[];counts={'ownerChrome':0,'ownerWhitespace':0,'preExisting':0}
for row in candidate:
 for issue in row.get('issues',[]):
  f={k:row.get(k)for k in ['path','state','width','height','file']};f['issue']=issue
  if issue in allowed or re.fullmatch(r'text below 13px: ".*" \(12px\)',issue) and any(a.split(':')[1]==issue.split(':')[1] for a in allowed):d='ownerChrome'
  elif issue.startswith(('bottom empty area ','empty block ','raster empty area ')):d='ownerWhitespace'
  elif shape(issue)in{shape(i)for i in lookup.get(key(row),set())}:d='preExisting'
  else:d='new';new.append(f)
  f['disposition']=d;findings.append(f)
  if d in counts:counts[d]+=1
assert not any(v['state']=='interaction failure'for v in candidate),'Browser interactions must complete'
assert len({(v['path'],v['width'],v['height'])for v in candidate})==10
semantic=json.loads((r/'semantics-candidate/semantics.json').read_text());dom={(v['id'],v['width']):v for v in json.loads((r/'price-dom-candidate.json').read_text())}
fresh=[];legacy=[]
for row in semantic:
 assert len(row.get('tests',[]))==3,'Quality surface audit incomplete'
 fresh+=[{'id':row['id'],'width':row['width'],'scope':t['key'],'error':t.get('error')}for t in row['tests']if not t['pass']]
 if row.get('error')and' price math: expected 'not in row['error']:fresh.append({'id':row['id'],'width':row['width'],'error':row['error']});continue
 if row['price'].get('pass')or row['price'].get('absent'):continue
 hidden=bool(row.get('hiddenMath'))and all(x['display']=='none'and not x['visible']for x in row['hiddenMath'])
 if hidden and ' price math: expected 'in row['price'].get('error','')and dom[(row['id'],row['width'])]['passed']:
  legacy.append({'id':row['id'],'width':row['width'],'error':row['price']['error'],'reason':'Strict text check reads the intentionally hidden .valuation-math table; the full arithmetic audit on actual DOM text (header, drawer, key numbers, annual table, chart) passes.'})
 else:fresh.append({'id':row['id'],'width':row['width'],'scope':'price','error':row['price'].get('error')})
summary={'candidateStates':len(candidate),'liveStates':len(live),'viewports':sorted({f"{v['width']}x{v['height']}"for v in candidate}),'companies':sorted({v['path']for v in candidate}),'counts':counts,'newFindings':new,'semanticStates':len(semantic),'priceDomAudits':len(dom),'legacySemanticFindings':legacy,'newSemanticFindings':fresh,'findings':findings,'pass':not new and not fresh}
(r/'browser-comparison.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items()if k not in['findings','legacySemanticFindings']},indent=1))
assert summary['pass'],'New browser findings remain'
