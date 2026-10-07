"""Isolate previously implemented flow fixes without changing any shipping rule."""
from pathlib import Path
import json,shutil,hashlib,datetime
repo=Path('/Users/miki/data/value-rules');r=repo/'.audit/rules-6';engines=r/'engines'
for variant in ['parent_allocation','ocf_fallback']:
 dst=engines/variant;shutil.copytree(r/'baseline-code/lib',dst/'lib')
 if variant=='parent_allocation':
  p=dst/'lib/value/valuation.ts';s=p.read_text().replace('const allocation = parentShare({...currentBalance,netIncome:trailing?.netIncome??latest.netIncome,totalNetIncome:trailing?.totalNetIncome??latest.totalNetIncome});','const allocationIncome = trailing?.netIncome != null && trailing.totalNetIncome != null ? trailing : latest;\n  const allocation = parentShare({...currentBalance,netIncome:allocationIncome.netIncome,totalNetIncome:allocationIncome.totalNetIncome});');p.write_text(s)
 else:shutil.copy2(engines/'flow_inputs/lib/value/owner-earnings.ts',dst/'lib/value/owner-earnings.ts')
seal=r/'evidence/research-seal.json';old=json.loads(seal.read_text());shutil.copy2(seal,r/'evidence/research-seal-flow-group.json')
old.update(isolatedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),isolationReason='Separate attribution of already-fixed parent-period alignment and OCF fallback; no rule or outcome tuning')
old['engines']={str(p.relative_to(repo)):hashlib.sha256(p.read_bytes()).hexdigest()for p in engines.rglob('*.ts')}
seal.write_text(json.dumps(old,indent=2)+'\n')
