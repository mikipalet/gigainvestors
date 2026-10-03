"""Exact nightly release gate. Optional price expectations must be computed by
memoAtPrice from the BEFORE financial model and the current quote. Only matching
changed leaves are excluded; a whole valuation, memo answer, or chart is never
blanket-ignored. Writes every residual and every price exclusion separately.

Usage: python3 scripts/value/nightly-exact-diff.py BEFORE AFTER OUTPUT_PREFIX [PRICE_EXPECTATIONS.json.gz]
"""
import collections,gzip,json,pathlib,sys
MISSING=object()
def same(a,b):
 return type(a)==type(b) and a==b

def differences(a,b,p=''):
 if type(a)==type(b) and isinstance(a,dict):
  for k in sorted(a.keys()|b.keys()):
   yield from differences(a.get(k,MISSING),b.get(k,MISSING),p+'/'+str(k).replace('~','~0').replace('/','~1'))
 elif type(a)==type(b) and isinstance(a,list):
  for i in range(max(len(a),len(b))):
   yield from differences(a[i] if i<len(a) else MISSING,b[i] if i<len(b) else MISSING,p+'/'+str(i))
 elif not same(a,b):
  yield {'path':p,'beforePresent':a is not MISSING,'afterPresent':b is not MISSING,**({'before':a} if a is not MISSING else {}),**({'after':b} if b is not MISSING else {})}

assert list(differences({'a':0},{'a':0}))==[]
assert len(list(differences({'a':0},{'a':0.000000000001})))==1
assert len(list(differences({'a':None},{})))==1
assert len(list(differences({'a':True},{'a':1})))==1
assert len(list(differences([1,2],[2,1])))==2
assert list(differences({'a':1,'b':2},{'b':2,'a':1}))==[]

def files(root):
 return {str(p.relative_to(root)):p for p in root.rglob('*') if p.is_file() and '.git' not in p.relative_to(root).parts}

def dossiers(root):
 result={}
 for p in (root/'dossiers').glob('*.json'): result.update(json.loads(p.read_text()))
 return result

def price_allowances(name, before, after, expectations, exclude_quotes=False):
 result={}
 if name.startswith('history/'):
  for pointer,diff in expectations.get('$priceHistory',{}).get(name,{}).items():
   parts=pointer.split('/')[1:]
   if name=='history/index.json':
    if not parts or parts[-1] not in {prefix+scope for prefix in ['avgReturn','medianReturn','returnCount','hitRate'] for scope in ['All','Quality','AtBuy']}:continue
   else:
    if len(parts)!=2 or not parts[0].isdigit() or parts[1] not in ['4','8']:continue
    i=int(pointer.split('/')[1])
    # A quote refresh cannot explain a different company at this row position.
    if not isinstance(before,list) or not isinstance(after,list) or i>=len(before) or i>=len(after) or before[i][0]!=after[i][0]:continue
   result[pointer]=diff
  return result
 if exclude_quotes and name.startswith('prices/') and isinstance(before,dict) and isinstance(after,dict):
  # This directory's schema contains only [close, date, optional seed] quotes.
  valid=lambda q:isinstance(q,list) and 2<=len(q)<=3 and isinstance(q[0],(int,float)) and not isinstance(q[0],bool) and isinstance(q[1],str) and (len(q)==2 or q[2]=='seed')
  if all(valid(q) for q in [*before.values(),*after.values()]):
   return {d['path']:d for d in differences(before,after)}
 if name.startswith('index/') and isinstance(before,list) and isinstance(after,list):
  for i,row in enumerate(before):
   if not isinstance(row,dict) or i>=len(after) or not isinstance(after[i],dict) or row.get('id')!=after[i].get('id'):continue
   expected=expectations.get(row.get('id'),{}).get('priceFields')
   if expected:
    for d in differences(expected['before']['b'],expected['after']['b'],f'/{i}/b'):result[d['path']]=d
  return result
 if not name.startswith('dossiers/') or not isinstance(before,dict) or not isinstance(after,dict):return result
 for id,expected in expectations.items():
  if id not in before or id not in after:continue
  if expected.get('priceFields'):
   for d in differences(expected['priceFields']['before'],expected['priceFields']['after'],f'/{id}'):
    relative=d['path'][len(id)+2:]
    if relative=='b' or relative.startswith('dataQualityFlags') or relative.startswith('tests/price/'):result[d['path']]=d
  old=before[id].get('ownerMemo',{}).get('lines',[]);new=after[id].get('ownerMemo',{}).get('lines',[])
  for i,line in enumerate(old):
   if line.get('question')!=7 or line!=expected.get('before'):continue
   # Changed line populations/order are not quote updates.
   if i>=len(new) or new[i].get('question')!=7 or 'after' not in expected:continue
   for d in differences(line,expected['after'],f'/{id}/ownerMemo/lines/{i}'):
    result[d['path']]=d
 return result

def is_price_difference(diff,allowed):
 return allowed.get(diff['path'])==diff

# Different statement inputs must never pass merely because a field is price-sensitive.
_price={'path':'/answer','beforePresent':True,'afterPresent':True,'before':'old','after':'new price'}
assert is_price_difference(_price,{'/answer':_price})
assert not is_price_difference({**_price,'after':'new financial basis'},{'/answer':_price})
assert not is_price_difference({**_price,'path':'/chart'}, {'/answer':_price})

def main():
 before,after,out=map(pathlib.Path,sys.argv[1:4]);a,b=files(before),files(after)
 expectations={}
 if len(sys.argv)>4:
  with gzip.open(sys.argv[4],'rt') as f:expectations=json.load(f)
 summary={'before':str(before),'after':str(after),'pass':True,'filesBefore':len(a),'filesAfter':len(b),'filesIdentical':0,'filesChanged':[],'filesAdded':[],'filesRemoved':[],'serializationOnly':[],'leafDifferences':0,'priceExcluded':0,'residualDifferences':0,'residualByDirectory':collections.Counter(),'byDirectory':collections.Counter(),'dossierPaths':collections.Counter(),'byCompany':{}}
 with gzip.open(str(out)+'-diffs.jsonl.gz','wt') as sink, gzip.open(str(out)+'-price-diffs.jsonl.gz','wt') as price_sink:
  for name in sorted(a.keys()|b.keys()):
   x=a[name].read_bytes() if name in a else None;y=b[name].read_bytes() if name in b else None
   if x==y:summary['filesIdentical']+=1;continue
   summary['pass']=False
   category='filesAdded' if x is None else 'filesRemoved' if y is None else 'filesChanged'
   summary[category].append(name)
   jx=json.loads(x) if x is not None else MISSING;jy=json.loads(y) if y is not None else MISSING
   allowed=price_allowances(name,jx,jy,expectations,len(sys.argv)>4)
   count=0
   for diff in differences(jx,jy):
    count+=1;summary['leafDifferences']+=1;summary['byDirectory'][name.split('/')[0]]+=1
    if is_price_difference(diff,allowed):
     summary['priceExcluded']+=1
     cause='dated historical price-return refresh' if name.startswith('history/') else 'quote-cache difference' if name.startswith('prices/') else 'existing live financial model repriced at staged quote'
     price_sink.write(json.dumps({'file':name,'cause':cause,**diff},separators=(',',':'),ensure_ascii=False)+'\n')
     continue
    summary['residualDifferences']+=1;summary['residualByDirectory'][name.split('/')[0]]+=1
    diff={'file':name,**diff}
    if name.startswith('dossiers/'):
     parts=diff['path'].split('/');id=parts[1] if len(parts)>1 else ''
     field=parts[2] if len(parts)>2 else 'population'
     summary['dossierPaths'][field]+=1
     summary['byCompany'].setdefault(id,collections.Counter())[field]+=1
    sink.write(json.dumps(diff,separators=(',',':'),ensure_ascii=False)+'\n')
   if not count:summary['serializationOnly'].append(name)
 x,y=dossiers(before),dossiers(after)
 summary['dossiers']={'before':len(x),'after':len(y),'added':sorted(y.keys()-x.keys()),'removed':sorted(x.keys()-y.keys())}
 memo=collections.Counter();flips=[];removals=[];answers=[]
 for id in sorted(x.keys()&y.keys()):
  for test in x[id]['tests'].keys()|y[id]['tests'].keys():
   l=x[id]['tests'].get(test,{}).get('result');r=y[id]['tests'].get(test,{}).get('result')
   if l!=r:flips.append({'id':id,'test':test,'before':l,'after':r})
  left={l['question']:l for l in x[id].get('ownerMemo',{}).get('lines',[])};right={l['question']:l for l in y[id].get('ownerMemo',{}).get('lines',[])}
  for q in left.keys()|right.keys():
   if q not in right:memo['removed']+=1;removals.append({'id':id,'question':q,'before':left[q]});continue
   if q not in left:memo['added']+=1;continue
   if left[q]!=right[q]:memo['changedLines']+=1
   for k in ['answer','chart','capitalAllocation','evidence','basis','tone']:
    if left[q].get(k)!=right[q].get(k):memo[k]+=1
   if left[q]['answer']!=right[q]['answer']:answers.append({'id':id,'question':q,'before':left[q]['answer'],'after':right[q]['answer']})
 summary['memo']=memo;summary['testFlips']=flips;summary['removedMemoLines']=removals;summary['changedAnswers']=answers
 summary['nonPricePass']=summary['residualDifferences']==0 and not summary['filesAdded'] and not summary['filesRemoved']
 pathlib.Path(str(out)+'-summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n')
 print(json.dumps({k:v for k,v in summary.items() if k not in ['filesChanged','filesAdded','filesRemoved','serializationOnly','byCompany','testFlips','removedMemoLines','changedAnswers']}))
 sys.exit(0 if summary['nonPricePass'] else 1)
if __name__=='__main__':main()
