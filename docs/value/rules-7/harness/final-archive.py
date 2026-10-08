import json,hashlib,subprocess
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-7');live=Path('/Users/miki/value-corpus/publish-repo');base=json.loads((r/'evidence/archive-baseline.json').read_text());bad=[]
for rel,want in base['files'].items():
 p=live/rel
 if not p.exists()or hashlib.sha256(p.read_bytes()).hexdigest()!=want:bad.append(rel)
head=subprocess.check_output(['/usr/bin/git','-C',str(live),'rev-parse','HEAD'],text=True).strip()
out={'files':len(base['files']),'changed':bad,'head':head,'matchesBoundCommit':head==base['commit']}
(r/'evidence/live-archive-final.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out));assert not bad and out['matchesBoundCommit']
