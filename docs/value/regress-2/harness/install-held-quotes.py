"""Stage the already reviewed held quotes as the normal prices commit would.
No quote fetching or external transport; only the local harness repository.
"""
import json,subprocess,hashlib
from pathlib import Path
root=Path.home()/'data/regress/run2';repo=root/'corpus/publish-repo';bare=root/'storage/remote.git'
assert subprocess.check_output(['/usr/bin/git','-C',str(repo),'remote','get-url','origin'],text=True).strip()==str(bare)
quotes=json.loads((Path.home()/'data/regress/release-bundle/held-quotes.json').read_text());accepted=list(quotes);changes=[]
p=repo/'prices/US.json';data=json.loads(subprocess.check_output(['/usr/bin/git','-C',str(repo),'show','HEAD:prices/US.json'],text=True))
for id in accepted:
 q=quotes[id];assert len(q)==2 and q[0]>0 and '2026-09-29'<=q[1]<='2026-10-06'
 changes.append({'id':id,'before':data.get(id),'after':q});data[id]=q
p.write_text(json.dumps(data)+'\n')
subprocess.run(['/usr/bin/git','-C',str(repo),'add','prices/US.json'],check=True,stdout=subprocess.DEVNULL)
subprocess.run(['/usr/bin/git','-C',str(repo),'commit','-m','harness: stage reviewed held quotes'],check=True,stdout=subprocess.DEVNULL)
head=subprocess.check_output(['/usr/bin/git','-C',str(repo),'rev-parse','HEAD'],text=True).strip()
subprocess.run(['/usr/bin/git','-c','protocol.allow=never','-c','protocol.file.allow=always','-C',str(repo),'push',str(bare),'HEAD:refs/heads/main'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
(root/'evidence/held-quote-stage.json').write_text(json.dumps({'localPriceCommit':head,'changes':changes,'externalTransport':False},indent=2)+'\n')
print('Reviewed held quotes staged locally:',len(changes))
