from pathlib import Path
import json,hashlib,datetime,shutil
here=Path(__file__).resolve().parent;repo=here.parents[1];work=repo/'.audit/rules-5'
seal=json.loads((here/'phase-1-freeze.json').read_text())
assert all(hashlib.sha256((here/n).read_bytes()).hexdigest()==v for n,v in seal['files'].items())
assert all(hashlib.sha256((repo/n).read_bytes()).hexdigest()==v for n,v in seal['production'].items())
assert min(shutil.disk_usage(p).free for p in ['/','/Users/miki/data'])>=4*1024**3
(here/'protocol-freeze.json').write_text(json.dumps({'frozenAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'auditSha256':hashlib.sha256((here/'phase-1-report.md').read_bytes()).hexdigest(),'protocolSha256':hashlib.sha256((here/'protocol.json').read_bytes()).hexdigest()},indent=2)+'\n')
for variant in ['sbc_once','current_scale','combined']:
 target=work/variant;shutil.copytree(repo/'lib',target/'lib')
 if variant in ['sbc_once','combined']:
  p=target/'lib/value/owner-earnings.ts';s=p.read_text();old='year.netIncome + (year.da - maintenanceCapex - (year.sbc ?? 0) - leaseCashCost) * allocation';new='year.netIncome + (year.da - maintenanceCapex - leaseCashCost) * allocation';assert old in s;s=s.replace(old,new);p.write_text(s)
  p=target/'lib/value/valuation.ts';s=p.read_text().replace('{ label: "− stock compensation", value: -mean(representative.map(row => (row.year.sbc ?? 0) * row.allocation!))! }','{ label: representative.some(row => row.cashFlowBasis) ? "− stock compensation" : "Stock compensation already expensed in net income", value: -mean(representative.map(row => (row.cashFlowBasis ? row.year.sbc ?? 0 : 0) * row.allocation!))! }')
  s=s.replace('const history = ownerEarningsBridge(ys), window = 5;', 'assumptions.push("Stock compensation is charged once: retained in net income; deducted only when the bridge starts from operating cash flow");\n  const history = ownerEarningsBridge(ys), window = 5;');p.write_text(s)
 if variant in ['current_scale','combined']:
  p=target/'lib/value/valuation.ts';s=p.read_text();needle='  const normalized = Math.min(medianEarnings, latestRow.value, ttmRow?.value ?? Infinity) + financingAdjustment;'
  new='''  // Normalize profitability at today's annual scale only after the existing
  // quality and both high-return capital tests establish earning power.
  const normalizationRoic = last(ys, 10).map(roic).filter((r): r is number => r !== null && Number.isFinite(r));
  const normalizationTotal = history.filter(row => row.year.fy > latest.fy - 10).map(row => returnOnTotalCapital(row.year, row.value)).filter((r): r is number => r !== null && Number.isFinite(r));
  const currentScale = version === 2 && qualityPass
    && normalizationRoic.length >= 8 && median(normalizationRoic)! >= T.valuation.compounderMinRoic
    && normalizationTotal.length >= T.valuation.compounderMinReturnYears && median(normalizationTotal)! + Number.EPSILON >= T.valuation.compounderMinTotalReturn
    && recent.every((row, i) => row.value > 0 && Number.isFinite(row.value) && row.year.revenue !== null && Number.isFinite(row.year.revenue) && row.year.revenue > 0 && (i === 0 || row.year.fy === recent[i-1].year.fy + 1));
  const marginRow = currentScale ? [...recent].sort((a,b) => a.value / a.year.revenue! - b.value / b.year.revenue!)[2] : null;
  const scaleFactor = marginRow ? latestRow.year.revenue! / marginRow.year.revenue! : 1;
  const normalizationBase = marginRow ? marginRow.value * scaleFactor : medianEarnings;
  const normalized = Math.min(normalizationBase, latestRow.value, ttmRow?.value ?? Infinity) + financingAdjustment;'''
  assert needle in s;s=s.replace(needle,new)
  s=s.replace('`owner earnings use the ${window}-year median capped at latest-year owner earnings and complete newer TTM owner earnings`', 'currentScale ? "Owner earnings use the five-year median owner margin at latest annual revenue, capped at latest annual and complete newer TTM owner earnings" : `owner earnings use the ${window}-year median capped at latest-year owner earnings and complete newer TTM owner earnings`')
  s=s.replace('normalized - financingAdjustment < medianEarnings ? "bridge components use the latest owner earnings observation" : "bridge components use the median owner earnings observation"', 'normalized - financingAdjustment < normalizationBase ? "bridge components use the latest owner earnings observation" : currentScale ? `Bridge components scale FY${marginRow!.year.fy} owner margin to FY${latestRow.year.fy} annual revenue; components are normalized estimates, not reported amounts` : "bridge components use the median owner earnings observation"')
  needle='const representative = ttmRow?.value === normalized - financingAdjustment ? [ttmRow as typeof latestRow] : normalized - financingAdjustment < medianEarnings ? [latestRow] : ordered.length % 2 ? [ordered[center]] : ordered.slice(center - 1, center + 1);'
  new='''const representative = ttmRow?.value === normalized - financingAdjustment ? [ttmRow as typeof latestRow] : normalized - financingAdjustment < normalizationBase ? [latestRow] : marginRow ? [marginRow] : ordered.length % 2 ? [ordered[center]] : ordered.slice(center - 1, center + 1);
  const bridgeScale = marginRow && representative[0] === marginRow && normalized - financingAdjustment === normalizationBase ? scaleFactor : 1;'''
  assert needle in s;s=s.replace(needle,new)
  # Scale monetary bridge components only, retaining the selected owner's allocation.
  a=s.index('    bridge: [',s.index('const bridgeScale'));b=s.index('      ...(financingAdjustment',a)
  chunk=s[a:b].replace('))!','))! * bridgeScale');s=s[:a]+chunk+s[b:];p.write_text(s)
print('Candidates written after audit freeze; no production changes')
