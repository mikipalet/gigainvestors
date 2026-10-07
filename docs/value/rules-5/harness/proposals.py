from pathlib import Path
import json,gzip,hashlib
r=Path('/Users/miki/data/value-rules/.audit/rules-5');e=r/'evidence';c=r/'corpus';read=lambda p:json.loads(p.read_text())
ps=read(c/'staging/preserved-buy-transitions.json');out=[]
for p in ps:
 id=p['id'];a=read(c/f'analysis/{id}.json');v=a.get('valuation')
 out.append({**p,'approved':False,'disposition':'Held at the complete live record; no economic rule change selected','name':a['company']['name'],'methodVersion':'3.5.0','qualityEvidence':{k:{'result':t['result'],'reasons':t['reasons'],'metrics':t['metrics']}for k,t in a['tests'].items()},'valuationEvidence':v,'analysisSha256':hashlib.sha256((c/f'analysis/{id}.json').read_bytes()).hexdigest()})
(e/'proposed-buy-approvals.json').write_text(json.dumps(out,indent=2)+'\n');print('Actual release buy proposals:',len(out),'approved:0')
