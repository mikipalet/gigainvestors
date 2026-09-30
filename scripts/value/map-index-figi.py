"""Cache public OpenFIGI evidence: five jobs/request, <=20 requests/minute, no key.
Run after index-membership to map unresolved ticker/ISIN rows. No EODHD requests.
"""
import json, pathlib, urllib.request, urllib.error, time, datetime, os
root=pathlib.Path(os.environ.get('VALUE_CORPUS_DIR',str(pathlib.Path.home()/'value-corpus')))/'index-membership'
mic={'NSE':'XNSE','SG':'XSES','NZ':'XNZE','US':'US','LSE':'XLON','XETRA':'XETR','PA':'XPAR','SW':'XSWX','ST':'XSTO','SA':'BVMF','AU':'XASX','MX':'XMEX','OL':'XOSL','CO':'XCSE','HE':'XHEL','LS':'XLIS','VI':'XWBO'}
rows=[r for i in json.load(open(root/'latest.json'))['indexes'] for r in i['unmatched']]
# Official Nifty list supplies ISINs even when local/home symbol caches are absent.
p=root/'official/Nifty 50.json'
if p.exists(): rows+=json.load(open(p))['components']
jobs=[]
for r in rows:
 if r.get('isin'): job={'idType':'ID_ISIN','idValue':r['isin']}
 elif r.get('code') and r.get('exchange') in mic:
  job={'idType':'TICKER','idValue':r['code'],('exchCode' if r['exchange']=='US' else 'micCode'):mic[r['exchange']]}
 else:continue
 if job not in jobs:jobs.append(job)
p=root/'openfigi.json';cache=json.load(open(p)) if p.exists() else {}
key=lambda j:json.dumps(j,sort_keys=True)
# Expand domestic ticker results to the same share class on other exchanges.
for e in list(cache.values()):
 if e['job'].get('micCode') not in ('XSES','XNZE'):continue
 for f in e['response'].get('data',[]):
  if f.get('shareClassFIGI'):
   j={'idType':'ID_BB_GLOBAL_SHARE_CLASS_LEVEL','idValue':f['shareClassFIGI']}
   if j not in jobs:jobs.append(j)
jobs=[j for j in jobs if key(j) not in cache]
for start in range(0,len(jobs),5):
 if os.statvfs('/').f_bavail*os.statvfs('/').f_frsize<5e9:raise SystemExit('Disk below 5 GB; stopping')
 batch=jobs[start:start+5];req=urllib.request.Request('https://api.openfigi.com/v3/mapping',data=json.dumps(batch).encode(),headers={'Content-Type':'application/json'})
 for attempt in range(3):
  try:
   with urllib.request.urlopen(req,timeout=30) as response:data=json.load(response)
   break
  except urllib.error.HTTPError as e:
   if e.code!=429:raise
   time.sleep(min(60,int(e.headers.get('ratelimit-reset','60'))+1))
 else:raise SystemExit('OpenFIGI rate limit persists')
 for j,d in zip(batch,data):cache[key(j)]={'job':j,'response':d,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 p.write_text(json.dumps(cache));print(start+len(batch),'/',len(jobs),flush=True);time.sleep(3.1)
