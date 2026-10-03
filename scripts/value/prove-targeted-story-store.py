"""Independent file/JSON-path allowlist proof; never writes to either store."""
import gzip,hashlib,json,sys
from pathlib import Path
source,target,evidence=map(Path,sys.argv[1:4])
def inventory(root):
 return {str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob('*')) if p.is_file()}
with gzip.open(evidence/'source-hashes.json.gz','rt') as f: original=json.load(f)
assert inventory(source)==original,'Live source changed (including .git)'
assert hashlib.sha256((source.parent/'publish.hold').read_bytes()).hexdigest()==(evidence/'hold-hash.txt').read_text().strip(),'Hold changed'
baseline={p:h for p,h in original.items() if not p.startswith('.git/') and p!='.git'}
staged=inventory(target)
assert staged.keys()==baseline.keys(),'Added/deleted files or .git included'
changes=[];diffs=[];counts={'dossiers':0,'priceStory':0,'q3':0,'q6':0,'unauthorizedPaths':0}
def diff(a,b,p):
 if a==b:return
 if isinstance(a,dict) and isinstance(b,dict):
  for k in sorted(a.keys()|b.keys()):
   if k not in a:diffs.append({'path':p+[k],'op':'add','after':b[k]})
   elif k not in b:diffs.append({'path':p+[k],'op':'remove','before':a[k]})
   else:diff(a[k],b[k],p+[k])
 elif isinstance(a,list) and isinstance(b,list) and p[-1:]!=['lines']:
  for i in range(max(len(a),len(b))):
   if i>=len(a):diffs.append({'path':p+[i],'op':'add','after':b[i]})
   elif i>=len(b):diffs.append({'path':p+[i],'op':'remove','before':a[i]})
   else:diff(a[i],b[i],p+[i])
 elif isinstance(a,list) and isinstance(b,list):
  assert len({x['question'] for x in a})==len(a) and len({x['question'] for x in b})==len(b)
  diff({str(x['question']):x for x in a},{str(x['question']):x for x in b},p)
 else:diffs.append({'path':p,'op':'replace','before':a,'after':b})
for f,sha in baseline.items():
 if staged[f]!=sha:
  assert f.startswith('dossiers/'),f'Non-dossier changed: {f}'
  changes.append({'file':f,'beforeSha256':sha,'afterSha256':staged[f]})
 if not f.startswith('dossiers/') or not f.endswith('.json'):continue
 a=json.loads((source/f).read_text());b=json.loads((target/f).read_text());assert a.keys()==b.keys()
 for id,d in a.items():
  counts['dossiers']+=1;n=b[id]
  assert 'priceStory' not in d, f'Expected additive priceStory: {id}'
  assert n.get('priceStory',{}).get('line'),f'Empty story: {id}'
  counts['priceStory']+=1
  aa={k:v for k,v in d.items() if k not in ('priceStory','ownerMemo')};bb={k:v for k,v in n.items() if k not in ('priceStory','ownerMemo')}
  assert aa==bb,f'Unauthorized dossier change: {id}'
  am=d.get('ownerMemo');bm=n.get('ownerMemo')
  if am is None:assert bm==am
  else:
   assert {k:v for k,v in am.items() if k!='lines'}=={k:v for k,v in bm.items() if k!='lines'},f'Memo metadata: {id}'
   old={l['question']:l for l in am['lines']};new={l['question']:l for l in bm['lines']}
   assert [l for l in am['lines'] if l['question'] not in (3,6)]==[l for l in bm['lines'] if l['question'] not in (3,6)],f'Other memo lines: {id}'
   reading=json.loads((source.parent/'price-story/readings'/f'{id}.json').read_text())
   for q in old.keys()|new.keys():
    if old.get(q)==new.get(q):continue
    assert q in (3,6) and q in new,f'Unauthorized memo change: {id} Q{q}'
    selected=reading['pricing' if q==3 else 'risk'].get('selected');line=new[q];literal=line.get('literal')
    assert selected and literal and selected['text'].startswith(literal['text']),f'Unselected memo: {id} Q{q}'
    assert literal['source']==selected['source'] and literal['date']==selected['date']
    assert line['evidence'][0]['url']==selected['url'] and line['evidence'][0]['quote']==literal['text']
    assert len(line['answer'].split())<=18
    counts[f'q{q}']+=1
  diff(d,n,[f,id])
for item in diffs:
 p=item['path'];assert p[2:3]==['priceStory'] or (p[2:4]==['ownerMemo','lines'] and p[4] in ('3','6')),f'Unauthorized path: {p}'
with gzip.open(evidence/'json-path-diff.jsonl.gz','wt') as f:
 for d in diffs:f.write(json.dumps(d,ensure_ascii=False)+'\n')
(evidence/'file-diff.json').write_text(json.dumps(changes,indent=2)+'\n')
(evidence/'copy-files.txt').write_text(''.join(c['file']+'\n' for c in changes))
summary={**counts,'sourceFiles':len(baseline),'changedFiles':len(changes),'byteIdenticalFiles':len(baseline)-len(changes),'newFiles':0,'removedFiles':0,'jsonPathChanges':len(diffs),'sourceAndGitUnchanged':True,'holdUnchanged':True,'nonDossierChanges':0}
(evidence/'proof.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary))
