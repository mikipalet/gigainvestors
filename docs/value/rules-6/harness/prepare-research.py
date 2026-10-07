from pathlib import Path
import shutil,json,hashlib,datetime
repo=Path('/Users/miki/data/value-rules');r=repo/'.audit/rules-6';engines=r/'engines'
for variant in ['sbc_once','current_scale','ttm_maintenance','combined']:
 dst=engines/variant;shutil.copytree(r/'baseline-code/lib',dst/'lib')
 p=dst/'lib/value/owner-earnings.ts';old=p.read_text();new=(repo/'lib/value/owner-earnings.ts').read_text()
 if variant=='sbc_once':p.write_text(old.replace('year.netIncome + (year.da - maintenanceCapex - (year.sbc ?? 0) - leaseCashCost) * allocation','year.netIncome + (year.da - maintenanceCapex - leaseCashCost) * allocation'))
 elif variant=='current_scale':
  p.write_text(old+new[new.index('/** Same maintenance model'):]);v=(repo/'lib/value/valuation.ts').read_text().replace('(row.cashFlowBasis ? row.year.sbc ?? 0 : 0)','(row.year.sbc ?? 0)');(dst/'lib/value/valuation.ts').write_text(v)
 elif variant=='ttm_maintenance':
  p.write_text(old+new[new.index('/** Same maintenance model'):]);p=dst/'lib/value/valuation.ts';v=p.read_text().replace('import { ownerEarningsBridge }','import { ownerEarningsBridge, trailingOwnerEarnings }').replace('ownerEarningsBridge([currentLeases != null ? {...trailing,leaseLiabilities:currentLeases} : trailing])[0]','trailingOwnerEarnings(ys,currentLeases != null ? {...trailing,leaseLiabilities:currentLeases} : trailing)');p.write_text(v)
 else:
  shutil.copy2(repo/'lib/value/owner-earnings.ts',p);shutil.copy2(repo/'lib/value/valuation.ts',dst/'lib/value/valuation.ts')
 if variant=='sbc_once':
  p=dst/'lib/value/valuation.ts';p.write_text(p.read_text().replace('(row.year.sbc ?? 0) * row.allocation!','(row.cashFlowBasis ? row.year.sbc ?? 0 : 0) * row.allocation!'))
seal={'frozenAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'ownerOverride':'Correctness ships; historical returns are reported, not a veto','protocolSha256':hashlib.sha256((repo/'docs/value/rules-6/plan.md').read_bytes()).hexdigest(),'engines':{str(p.relative_to(repo)):hashlib.sha256(p.read_bytes()).hexdigest()for p in engines.rglob('*.ts')}}
(r/'evidence/research-seal.json').write_text(json.dumps(seal,indent=2)+'\n')
