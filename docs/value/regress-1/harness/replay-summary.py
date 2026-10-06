import json,re,collections
from pathlib import Path
r=Path.home()/'data/regress';e=r/'evidence';result={}
for group in ['released','remaining']:
 name='complete-'+group;receipt=json.loads((e/(name+'-cache-receipt.json')).read_text());log=(e/('analyze-'+name+'.log')).read_text()
 result[group]={'ids':len(json.loads((e/(group+'-ids.json')).read_text())),'exit':int((e/('analyze-'+name+'.exit')).read_text()),'started':receipt['started'],'completed':receipt['completed'],'implementationSha256':receipt['implementationSha256'],'implementationUnchanged':receipt['implementationUnchanged'],'cachedReadings':receipt['count'],'summaries':[x for x in log.splitlines()if 'written' in x and 'unchanged'in x],'failedIds':sorted(set(re.findall(r'^analyze: (\S+):',log,re.M))),'error':receipt.get('error')}
result['allIds']=sum(x['ids']for x in result.values());result['sameImplementation']=result['released']['implementationSha256']==result['remaining']['implementationSha256']
(e/'full-replay-summary.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
