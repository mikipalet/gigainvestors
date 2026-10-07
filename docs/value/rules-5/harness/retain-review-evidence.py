"""Keep small review receipts and the ten relevant final screenshots in git."""
from pathlib import Path
import shutil
r=Path('/Users/miki/data/value-rules');e=r/'.audit/rules-5/evidence';out=r/'docs/value/rules-5/evidence';out.mkdir(exist_ok=True)
names=['replay-archive-integrity.json','verification.json','release-audit.json','current-release-changes.json','current-release-changes.csv','current-value-change-counts.json','proposed-buy-approvals.json','preserved-records.json','price-gate-proof.json','publication-blockers.json','failed-publish-comparison.json','source-drift-summary.json','input-integrity.json','live-archive-final.json','isolation.json','browser-comparison.json','browser-store-isolation.jsonl','visual-review.json','analysis-run-summary.json','retained-cache-failures.json','unexpected-analysis-failures.json','bundle-integrity.json','secret-scan.json','controller-syntax.json','unit-final-isolated.log','unit-final-isolated.exit','presentation-final.log','presentation-final.exit','build-candidate.log','build-candidate.exit','publish-out-final.log','publish-out-final.exit','publish-real.log','publish-real.exit','post-check.log','post-check.exit','cleanup.json']
for name in names:
 if(e/name).exists():shutil.copy2(e/name,out/name)
(out/'screenshots').mkdir(exist_ok=True)
for id in ['GOOGL','NVDA','MSFT','AAPL','COST']:
 for size in ['1728x970','390x844']:
  name=f'{size}-_s_{id}_US-6-Open_Cash_for_owners_evidence.png';shutil.copy2(e/'browser'/name,out/'screenshots'/name)
print('Review receipts and 10 final screenshots retained')
