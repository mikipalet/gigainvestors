import os,json,gzip,shutil
from pathlib import Path
root=Path(os.environ['PUBFIX_ROOT']);e=root/'evidence';out=Path('docs/value/jev-2')
names=['ALSN.US-page.txt','ALSN.US.png','ALSN.US-valuation.png','FDJU.PA-page.txt','FDJU.PA.png','FDJU.PA-valuation.png','attribution.json','attribution.log','baseline-out.log','browser.json','browser.log','build.log','changed-valuations.csv','changed-valuations.json','comparison.json','comparison.log','consistency.json','consistency.log','copy-audit.json','copy-audit.log','disk.jsonl','dry-run-final.log','dry-run-terminated.log','final-audit.json','cleanup.json','isolation.json','real-publish.log','real-publish.exit','real-publish-terminated.log','real-publish-heap-limit.log','released-baseline-diff.json','setup.json','targets.json','verification.json','guard.log','real-byte-proof.json','retained-logo-audit.json']
for name in names:
 if (e/name).exists():shutil.copy2(e/name,out/name)
with (e/'all-dossier-changes.json').open('rb') as src,gzip.open(out/'all-dossier-changes.json.gz','wb') as dst:shutil.copyfileobj(src,dst)
rows=[json.loads(s) for s in (e/'disk.jsonl').read_text().splitlines()]
(out/'disk-summary.json').write_text(json.dumps({'samples':len(rows),'minimumFreeGiB':{p:min(r['free'][p] for r in rows)/1024**3 for p in rows[0]['free']}},indent=2)+'\n')

# Normalize exported text whitespace; retain JSON values and compressed evidence.
for p in out.iterdir():
 if p.suffix in ['.log','.txt','.csv']:
  text=p.read_text();p.write_text('\n'.join(line.rstrip() for line in text.splitlines()).rstrip()+'\n' if text else '')
