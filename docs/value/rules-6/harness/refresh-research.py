from pathlib import Path
import json,shutil,hashlib,datetime
repo=Path('/Users/miki/data/value-rules');r=repo/'.audit/rules-6';engines=r/'engines'
seal=r/'evidence/research-seal.json';shutil.copy2(seal,r/'evidence/research-seal-initial.json')
for variant in ['flow_inputs','combined']:
 dst=engines/variant
 if variant=='flow_inputs':
  shutil.copytree(r/'baseline-code/lib',dst/'lib')
  p=dst/'lib/value/owner-earnings.ts';p.write_text(p.read_text().replace('(year.da === null || growthCapex === null)','(year.netIncome === null || year.da === null || growthCapex === null)').replace('(cashFlowBasis ? year.capex :','(cashFlowBasis && (year.da === null || growthCapex === null) ? year.capex :'))
  p=dst/'lib/value/valuation.ts';s=p.read_text().replace('const allocation = parentShare({...currentBalance,netIncome:trailing?.netIncome??latest.netIncome,totalNetIncome:trailing?.totalNetIncome??latest.totalNetIncome});','const allocationIncome = trailing?.netIncome != null && trailing.totalNetIncome != null ? trailing : latest;\n  const allocation = parentShare({...currentBalance,netIncome:allocationIncome.netIncome,totalNetIncome:allocationIncome.totalNetIncome});');p.write_text(s)
 else:
  for name in ['owner-earnings.ts','valuation.ts']:shutil.copy2(repo/'lib/value'/name,dst/'lib/value'/name)
 shutil.copy2(repo/'lib/value/valuation-inputs.ts',dst/'lib/value/valuation-inputs.ts')
seal.write_text(json.dumps({'frozenAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'ownerOverride':True,'revisionReason':'Correct explicit annual/TTM flow leakage and paired-period parent attribution found before portfolio evaluation; no outcome tuning','protocolSha256':hashlib.sha256((repo/'docs/value/rules-6/plan.md').read_bytes()).hexdigest(),'engines':{str(p.relative_to(repo)):hashlib.sha256(p.read_bytes()).hexdigest()for p in engines.rglob('*.ts')}},indent=2)+'\n')
