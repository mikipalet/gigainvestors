import hashlib,json,time
from pathlib import Path
root=Path.home()/'data/regress';corpus=root/'corpus'
prefixes=['fundamentals','raw/eodhd','raw/sec-companyfacts','raw/sec-annual','raw/annual-reviewed','raw/reviewed-trailing','raw/edinet/issuers','completeness','reports','jev','judgement','prices-history','bonds']
sources={};total=0;start=time.time()
for prefix in prefixes:
 for p in (corpus/prefix).rglob('*'):
  if not p.is_file():continue
  h=hashlib.sha256()
  with p.open('rb')as f:
   for block in iter(lambda:f.read(1024*1024),b''):h.update(block);total+=len(block)
  sources[str(p.relative_to(corpus))]=h.hexdigest()
(root/'evidence/analyzed-source-hashes.json').write_text(json.dumps(sources,separators=(',',':'))+'\n')
summary={'files':len(sources),'bytes':total,'elapsedSeconds':round(time.time()-start,1)}
(root/'evidence/source-hash-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(summary)
