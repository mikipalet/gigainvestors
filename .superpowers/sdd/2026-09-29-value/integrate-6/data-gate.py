from pathlib import Path
import json,re,gzip,hashlib,collections
r=Path('.int6');before=Path('/Users/miki/value-corpus/publish-repo');after=Path('/tmp/value-int6-store');load=lambda p:json.loads(p.read_text())
D=lambda root:{k:v for p in (root/'dossiers').glob('*.json') for k,v in load(p).items()}
a,b=D(before),D(after);frozen=set(load(Path('.ttm-1/corpus/verdict-freeze.json'))['ids'])
# Run the same semantic numeric audit as nightly-9, including packed public vectors.
source=Path('.superpowers/sdd/2026-09-29-value/nightly-9-semantic-store-null-audit.py').read_text()
source=source.replace("r=Path('.fix5c/nightly-9');a=Path('/Users/miki/value-corpus/publish-repo');b=r/'after-final';frozen=set(json.loads((r/'corpus/verdict-freeze.json').read_text())['ids']);out=[]", "r=Path('.int6');a=Path('/Users/miki/value-corpus/publish-repo');b=Path('/tmp/value-int6-store');frozen=set(json.loads(Path('.ttm-1/corpus/verdict-freeze.json').read_text())['ids']);out=[]")
exec(source,{});nulls=load(r/'semantic-store-nulls-summary.json')
changes=[];unapproved=[];blank=[];lost=[];removed=[];frozenDiff=[];priceChanges=[]
quality=['understandable','moat','economics','management','accounting']
for id,x in a.items():
 y=b.get(id)
 if not y:continue
 if id in frozen and x!=y:frozenDiff.append(id)
 for key in quality:
  old=x['tests'][key]['result'];new=y['tests'][key]['result']
  if old!=new:
   p=y['tests'][key].get('provisional');change={'id':id,'company':y['company']['name'],'test':key,'old':old,'new':new,'ltm':p};changes.append(change)
   if not p:unapproved.append(change)
 old=x['tests'].get('price',{}).get('result');new=y['tests'].get('price',{}).get('result')
 if old!=new:priceChanges.append({'id':id,'old':old,'new':new})
 if old in ['pass','fail'] and new not in ['pass','fail']:blank.append(id)
 for field,rows in x.get('series',{}).items():
  target=dict(y.get('series',{}).get(field,[]))
  for fy,v in rows:
   if type(v) in (int,float) and fy not in target:removed.append({'id':id,'field':field,'fy':fy})
for p in (before/'history').glob('*.json'):
 if not re.fullmatch(r'\d{4}(?:Q[1-4])?\.json',p.name):continue
 old=load(p);q=after/'history'/p.name;new=load(q) if q.exists() else []
 missing={row[0] for row in old}-{row[0] for row in new}
 if missing:lost.append({'file':p.name,'ids':sorted(missing)})
lostpred=[id for id in a if a[id].get('predecessorHistory') and not b.get(id,{}).get('predecessorHistory')]
# Reuse nightly-9's raw record extraction to compare all frozen public rows byte for byte.
src=Path('.superpowers/sdd/2026-09-29-value/nightly-9-audit.py').read_text();functions=src[src.index('def pairs'):src.index('old,oa=')];ns={'json':json,'re':re,'load':load,'frozen':frozen,'dec':json.JSONDecoder()};exec(functions,ns)
x,xa=ns['records'](before);y,ya=ns['records'](after)
rawdiff=[k for k in x.keys()|y.keys() if x.get(k)!=y.get(k)];aliasdiff=[k for k in xa.keys()|ya.keys() if xa.get(k,{})!=ya.get(k,{})]
checks={'sameUniverseCount':load(before/'meta.json')['counts']['universe']==load(after/'meta.json')['counts']['universe'],'sameMembership':a.keys()==b.keys(),'freeze147':len(frozen)==147,'frozenDossiers':not frozenDiff,'frozenRawRecords':not rawdiff,'frozenAliases':not aliasdiff,'zeroUnapprovedFlips':not unapproved,'zeroNumericToNull':nulls['occurrences']==0,'zeroLostHistory':not lost and not removed and not lostpred,'zeroBlankedPriceVerdicts':not blank,'zeroPriceVerdictChanges':not priceChanges}
result={'checks':checks,'pass':all(checks.values()),'companies':len(b),'frozen':len(frozen),'frozenRecords':len(x),'changes':changes,'unapproved':unapproved,'numericToNull':nulls['occurrences'],'lostHistory':lost,'removedSeries':removed,'lostPredecessors':lostpred,'frozenDifferences':frozenDiff,'frozenRawDifferences':rawdiff,'frozenAliasDifferences':aliasdiff,'blankedPrice':blank,'priceChanges':priceChanges}
(r/'data-gate.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['changes','frozenRawDifferences']},indent=2))
