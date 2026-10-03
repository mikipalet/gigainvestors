"""Add exact, dated price-return changes between two live releases to a quote
counterfactual. Other history fields and changes of company identity stay strict.
Usage: ORIGINAL_RELEASE CURRENT_RELEASE QUOTE_EXPECTATIONS.json.gz OUTPUT.json.gz
"""
import gzip,importlib.util,json,pathlib,re,sys
module=pathlib.Path(__file__).with_name('nightly-exact-diff.py')
spec=importlib.util.spec_from_file_location('nightly_exact',module);exact=importlib.util.module_from_spec(spec);spec.loader.exec_module(exact)
original,current,quotes,output=map(pathlib.Path,sys.argv[1:5])
with gzip.open(quotes,'rt') as f:expected=json.load(f)
allowed={};count=0
returns={prefix+scope for prefix in ['avgReturn','medianReturn','returnCount','hitRate'] for scope in ['All','Quality','AtBuy']}
for p in (original/'history').glob('*.json'):
 q=current/'history'/p.name
 if not q.exists():continue
 before=json.loads(p.read_text());after=json.loads(q.read_text());file='history/'+p.name
 for d in exact.differences(before,after):
  parts=d['path'].split('/')[1:]
  if p.name=='index.json':
   if not parts or parts[-1] not in returns:continue
  elif re.fullmatch(r'\d{4}(?:Q[1-4])?\.json',p.name):
   if len(parts)!=2 or parts[1] not in ['4','8']:continue
   i=int(parts[0])
   if i>=len(before) or i>=len(after) or before[i][0]!=after[i][0]:continue
   if parts[1]=='4':
    # Returns must use the same original historical price/basis.
    if before[i][5:8]!=after[i][5:8]:continue
   elif not (not d['beforePresent'] and isinstance(d.get('after'),dict) and set(d['after'])=={'date'}):continue
  else:continue
  # Comparison direction is current live -> replay of the earlier frozen input.
  allowed.setdefault(file,{})[d['path']]={'path':d['path'],'beforePresent':d['afterPresent'],'afterPresent':d['beforePresent'],**({'before':d['after']} if d['afterPresent'] else {}),**({'after':d['before']} if d['beforePresent'] else {})};count+=1
expected['$priceHistory']=allowed
with gzip.open(output,'wt') as f:json.dump(expected,f,separators=(',',':'))
print(json.dumps({'exactPriceHistoryExpectations':count,'files':len(allowed)}))
