import os,json,hashlib
from pathlib import Path
root=Path(os.environ['PUBFIX_ROOT'])
def manifest(p):
 result={};size=0
 for f in p.rglob('*.json'):
  rel=f.relative_to(p)
  if '.git' in rel.parts:continue
  data=f.read_bytes();size+=len(data);result[str(rel)]=hashlib.sha256(data).hexdigest()
 total=hashlib.sha256(''.join(k+'\0'+result[k]+'\n' for k in sorted(result)).encode()).hexdigest()
 return result,size,total
actual,size,total=manifest(root/'corpus/publish-repo');expected,_,wanted=manifest(root/'dry-run')
result={'files':len(actual),'bytes':size,'sha256':total,'dryRunSha256':wanted,'missing':sorted(expected.keys()-actual.keys()),'extra':sorted(actual.keys()-expected.keys()),'changed':[k for k in sorted(actual.keys()&expected.keys()) if actual[k]!=expected[k]],'equal':actual==expected}
name=os.environ.get('PUBFIX_PROOF_NAME','real')
(root/f'evidence/{name}-byte-proof.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));assert result['equal']
