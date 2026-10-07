from pathlib import Path
import shutil
r=Path('/Users/miki/data/value-rules');e=r/'.audit/rules-6/evidence';out=r/'docs/value/rules-6/evidence';out.mkdir(exist_ok=True)
# Keep compact receipts, full approval evidence, test logs, and selected screenshots.
for p in e.iterdir():
 if p.is_file()and p.suffix in ['.json','.jsonl','.csv','.md','.exit']and p.name not in ['source-baseline.json','archive-baseline.json','disk.jsonl']and not p.name.startswith(('candidate-','task-')):
  shutil.copy2(p,out/p.name)
for name in ['unit-final-isolated','build-candidate','publish-out-final','publish-real','post-check','final-types']:
 shutil.copy2(e/(name+'.log'),out/(name+'.log'))
(out/'screenshots').mkdir(exist_ok=True)
for id in ['GOOGL','NVDA','MSFT','AAPL','COST']:
 for size in ['1728x970','390x844']:
  name=f'{size}-_s_{id}_US-6-Open_Cash_for_owners_evidence.png';shutil.copy2(e/'browser'/name,out/'screenshots'/name)
for p in (e/'semantics-candidate').glob('*-normalization.png'):
 shutil.copy2(p,out/'screenshots'/p.name)
print('Review receipts, full proposed manifest and twenty reviewed screenshots retained')
