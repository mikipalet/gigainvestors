import json,pathlib,hashlib,collections,re,gzip,sys
r=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '.fix5c/nightly-8').resolve();before=pathlib.Path('/Users/miki/value-corpus/publish-repo');after=r/'after-final'
load=lambda p:json.loads(p.read_text())
frozen=set(load(r/'corpus/verdict-freeze.json')['ids']);dec=json.JSONDecoder()
def pairs(text):
 i=1;out={};arr=text.lstrip().startswith('[');j=0
 while True:
  while text[i:i+1] in [' ', '\n','\t','\r',',']:i+=1
  if text[i:i+1] in [']','}','']:return out
  if arr:key=j;j+=1
  else:
   key,end=dec.raw_decode(text,i);i=end
   while text[i:i+1] in [' ', '\n','\t','\r',':']:i+=1
  val,end=dec.raw_decode(text,i);out[key]=(val,text[i:end]);i=end

def records(root):
 out={};aliases={}
 for directory in ['dossiers','index','history','search']:
  for p in (root/directory).glob('*.json'):
   file=str(p.relative_to(root));raw=p.read_text();obj=load(p)
   if directory=='dossiers':rows={id:t for id,(v,t) in pairs(raw).items()}
   elif directory=='index' or directory=='history' and p.name=='companies.json':rows={v['id']:t for v,t in pairs(raw).values()}
   elif directory=='history' and re.fullmatch(r'\d{4}(Q[1-4])?\.json',p.name):rows={v[0]:t for v,t in pairs(raw).values()}
   elif directory=='search' and p.name!='manifest.json':
    rows={v[0]:t for v,t in pairs(pairs(raw)['rows'][1]).values()}
    aliases[file]={k:[obj['rows'][i][0] for i in indices if obj['rows'][i][0] in frozen] for k,indices in obj['aliases'].items() if any(obj['rows'][i][0] in frozen for i in indices)}
   else:continue
   for id,text in rows.items():
    if id in frozen:out[file+'#'+id]=text
 return out,aliases
old,oa=records(before);new,na=records(after)
errors=[k for k in old.keys()|new.keys() if old.get(k)!=new.get(k)]
alias_errors=[k for k in oa.keys()|na.keys() if oa.get(k,{})!=na.get(k,{})]
D=lambda root:{id:d for p in (root/'dossiers').glob('*.json') for id,d in load(p).items()}
a,b=D(before),D(after);changed=sorted(id for id in a.keys()&b.keys() if a[id]!=b[id]);flips=[]
report=pathlib.Path('.superpowers/sdd/2026-09-29-value/nightly-5-report.md').read_text()
allow={(m[0],m[1]):'APPROVED' for m in re.findall(r'^\| (\S+) — .*? \| (\w+) \| .*?\*\*APPROVED\*\*',report,re.M)}
fields=collections.Counter();series=collections.Counter();nulls=[]
for id in changed:
 for k in a[id].keys()|b[id].keys():
  if a[id].get(k)!=b[id].get(k):fields[k]+=1
 for k in ['understandable','moat','economics','management','accounting']:
  x=a[id]['tests'][k]['result'];y=b[id]['tests'][k]['result']
  if x!=y:flips.append({'id':id,'test':k,'before':x,'after':y,'decision':allow.get((id,k),'UNREVIEWED')})
 for k,rows in b[id].get('series',{}).items():
  prior=dict(a[id].get('series',{}).get(k,[]))
  for fy,val in rows:
   if fy in prior and prior[fy]!=val:
    series[k]+=1
    if val is None and isinstance(prior[fy],(int,float)):nulls.append({'id':id,'field':k,'fy':fy,'before':prior[fy]})
manifest=load(r/'live-manifest.json');current={str(p.relative_to(before)):hashlib.sha256(p.read_bytes()).hexdigest() for p in before.rglob('*') if p.is_file() and '.git' not in p.relative_to(before).parts}
result={'beforeCount':len(a),'afterCount':len(b),'added':sorted(b.keys()-a.keys()),'removed':sorted(a.keys()-b.keys()),'changedCompanies':len(changed),'changedIds':changed,'frozen':len(frozen),'frozenRecordsCompared':len(old),'frozenByteMismatches':errors,'frozenAliasMismatches':alias_errors,'verdictChanges':flips,'topLevelChanges':dict(fields),'seriesNumericChangesByField':dict(series),'sameYearNumericToNull':nulls,'liveFilesChangedExternally':[k for k in manifest.keys()|current.keys() if manifest.get(k)!=current.get(k)],'holdUnchanged':hashlib.sha256(pathlib.Path('/Users/miki/value-corpus/publish.hold').read_bytes()).hexdigest()==(r/'hold-sha256.txt').read_text().strip(),'shortHistories':sum(d['status']=='insufficient_data' for d in b.values()),'predecessors':[id for id,d in b.items() if d.get('predecessorHistory')],'priceStoryCount':sum(bool(d.get('priceStory')) for d in b.values())}
(r/'audit.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['changedIds','sameYearNumericToNull','seriesNumericChangesByField']},indent=2));print('Same-year numeric-to-null',len(nulls))
assert not errors and not alias_errors
assert frozen <= a.keys() and frozen <= b.keys()

with gzip.open(r/'freeze-receipt.json.gz','wt') as f:json.dump({k:{'before':hashlib.sha256(old[k].encode()).hexdigest(),'after':hashlib.sha256(new.get(k,'').encode()).hexdigest()} for k in old},f)
