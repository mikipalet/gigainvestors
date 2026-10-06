import os,json
from pathlib import Path
root=Path(os.environ['PUBFIX_ROOT'])
def index(p):return {r['id']:r for f in (p/'index').glob('*.json') for r in json.loads(f.read_text())}
a=index(root/'baseline');b=index(root/'dry-run')
links={'FDJU.PA':'https://www.fdjunited.com/wp-content/uploads/2026/07/20260729-FDJUNITEDpressrelease-H12026results.pdf','ALSN.US':'https://www.sec.gov/Archives/edgar/data/1411207/000119312526334039/alsn-20260630.htm'}
reasons={'FDJU.PA':'Controller approved 2026-10-05: H1 cash EUR 794.1m → 419.2m, debt EUR 2261.7m → 2211.7m; unchanged 35% required margin. Balance-sheet correction only.','ALSN.US':'Controller approved 2026-10-05: June debt USD 2.921bn → 4.114bn and cash USD 1.495bn → 0.399bn; existing leverage rule raises required margin to 50%. Normalized earnings unchanged.'}
state=lambda r:{k:r[k] for k in ['b','v','m']}
rows=[]
for id in links:
 assert a[id]['b'] and not b[id]['b']
 rows.append({'id':id,'before':state(a[id]),'after':state(b[id]),'reason':reasons[id],'evidence':[links[id]]})
Path('scripts/value/approved-verdict-changes.json').write_text(json.dumps(rows,indent=2)+'\n')
print('Recorded two exact controller-approved transitions')
