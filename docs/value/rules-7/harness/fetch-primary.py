import json,urllib.request,hashlib,subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
root=Path('/Users/miki/data/value-rules/.audit/rules-7/primary')
urls=json.loads((root/'urls.json').read_text())
def fetch(item):
 key,url=item; target=root/(key+('.pdf' if '.pdf' in url.lower() else '.html'))
 try:
  if not target.exists():
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=45)as response: target.write_bytes(response.read())
  data=target.read_bytes()
  if data.startswith(b'%PDF'):subprocess.run(['pdftotext','-layout',str(target),str(root/(key+'.txt'))],check=True)
  return {'key':key,'url':url,'path':str(target.relative_to(root)),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
 except Exception as exc:return {'key':key,'url':url,'error':str(exc)}
with ThreadPoolExecutor(max_workers=4)as pool:records=list(pool.map(fetch,urls.items()))
(root/'fetches.json').write_text(json.dumps(records,indent=2)+'\n')
for record in records:print(record['key'],record.get('bytes',record.get('error')))
