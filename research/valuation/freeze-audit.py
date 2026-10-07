from pathlib import Path
import csv,json,gzip,hashlib,datetime,collections,statistics,subprocess
r=Path(__file__).resolve().parent;o=r/'outputs'
labels={(i,q,h):v for i,q,h,v in json.load(gzip.open(o/'return-labels.json.gz'))};groups=collections.defaultdict(list)
for p in sorted((o/'baseline').glob('*.json.gz')):
 for x in json.load(gzip.open(p)):
  if x['status']!='paired':continue
  v=x['valuation'];b=x['baseline'];q=x['quarter'];i=x['id'];period='train'if q<='2015Q3'else'later';scope='US'if i.endswith('.US')else'international'
  for h in [3,5]:
   ret=labels.get((i,q,h))
   if ret is not None and v:groups[scope,period,h,v['method'],bool(b[3])].append(ret)
pathrows=[dict(scope=s,period=p,horizon=h,method=m,buy=b,n=len(rs),median_return=statistics.median(rs),negative=sum(v<0 for v in rs)/len(rs))for(s,p,h,m,b),rs in sorted(groups.items())]
with(o/'path-outcomes.csv').open('w')as f:
 w=csv.DictWriter(f,fieldnames=list(pathrows[0]),lineterminator='\n');w.writeheader();w.writerows(pathrows)
def table(path,fields):
 rows=list(csv.DictReader(open(path)));return '\n'.join(['| '+' | '.join(fields)+' |','| '+' | '.join(['---']*len(fields))+' |']+['| '+' | '.join(str(x[k]) for k in fields)+' |' for x in rows])
text='''# Phase 1 — valuation and price audit, frozen before production changes

GOOGL's quality rejection is partly caused by a real accounting defect: the ordinary owner-earnings bridge charges stock compensation twice. NVDA's low value mainly reflects a stale dollar earnings base, and its steeply rising margins trigger the cyclical safety discount and exclude the compounder tier. Neither observation proves that either stock is a buy at today's price.

The .75 conversion in GOOGL's verdict is the ratio of five-year totals; .77 is the median annual ratio and .81 is the latest annual ratio. All three can be correct; the page fails to make the aggregate-versus-annual distinction clear. Presentation correction is justified without relaxing the .80 threshold.

No production code or thresholds have changed. Baseline commit800a816, method3.5.0; full inventory below covers operating, financial and NAV paths, bridges, growth, fade, required return, safety, buy/IRR, cash/debt and cash conversion. Current source reads are local/read-only; the web supplied principle/accounting references only.

## Evidence, not a claim of a tradable backtest

Baseline replay:2,058 identities,99,691 company-quarter rows;93,961 paired,5,572 reporting/trading currency mismatches,158 unavailable. These missing rows stay explicitly unmeasured. Train US2005–2015; international both periods; **all US2016–2026 results are CONTAMINATED**. Train signals end2015Q3 and returns end2015-12-31; later signals end2026Q2 and realized prices end2026-09-30. The limited universe has no US signal observations for the first three quarters of2005. Three/five-year cohorts must mature inside their period; no overlapping cross-split labels. Detailed denominator, quintile and pass/fail tables are in outputs/baseline-predictiveness.csv.

Current inventory:2,147 owner-earnings valuations,280 book valuations,7 NAV valuations. Of operating valuations,351 use less than half latest annual owner earnings;322 pass all quality tests and18 are buys. Financials have60 quality passes and8 buys. Median model growth is0% operating versus6% financial. The median operating terminal present-value share is49.86%. These quantify structural asymmetry, not its causal return contribution.

Price/value and expected-return rank associations with future returns are weak. US training: three-year mean within-quarter Spearman−.0077 for price/value and+.0079 for expected return; five-year signs reverse(+.0361/−.0263). International associations mostly favor cheaper/higher-return estimates but remain small. These do not validate precise point values or provide evidence for tuning caps. Dependent cohorts, survivorship and current/restated inputs preclude conventional independent-sample significance claims.

## Three/five-year rank predictiveness

'''+table(o/'correlation-summary.csv',['scope','period','horizon','metric','quarters','mean_spearman'])+'''

## Iconic buy frequency

Most named compounders were never buys in the available history; Apple had five later-US buys, a CONTAMINATED diagnostic. GOOGL/NVDA/COST/V/MA/MSFT/ASML/LVMH had zero. Some fail quality even when a price gate passes (MSFT training); others never pass price. Missing early histories, share bases and archival classification limit interpretation. GOOG and alternate ASML/LVMH identities are not separate independent observations.

'''+table(o/'iconic-buy-frequency.csv',['id','period','rows','quality_pass','valued','price_pass','buy','buy_quarters','median_price_value'])+'''

## Losing buys and path differences

There are269 negative matured buy-outcome records across the two horizons; repeated dates/horizons are not269 independent companies. Examples: Jupiter Asset Management2019Q3−73.26% over3y, Morgan Stanley2007Q3−59.03%, Globe Life2006Q1−52.74%, Continental2019Q3−51.91%. These all passed numeric quality at the signal; a losing outcome is evidence against perfect protection, not proof that the business was known to be weak then. Every negative case, including financials, is in outputs/losing-buys.csv.

'''+table(o/'path-outcomes.csv',['scope','period','horizon','method','buy','n','median_return','negative'])+'\n\n'+(r/'audit-inventory.md').read_text()+'''

## Phase-2 scope proposed before candidate evaluation

Test an accounting-identity correction charging SBC exactly once, and a current-scale normalization correction using median owner margin at latest annual sales only for already quality-passing high-return firms. Keep all growth caps, discount floors, safety tiers, financial/NAV formulas and the economics threshold unchanged. Reject either correction for shipment if the fixed ship rule fails, even when its accounting rationale is clear. Do not tune candidate parameters on any later-US outcomes. Declare exact eligibility, caps, bridges and loser counting in protocol.json before implementing/evaluating candidates. Presentation correction needs no return fitting.
'''
(r/'phase-1-report.md').write_text(text)
files=['phase-1-report.md','audit-inventory.md','plan.md','replay.ts','current-audit.ts','audit.py','freeze-audit.py']+['outputs/'+p.name for p in o.iterdir()if p.is_file()]
sources=['lib/value/valuation.ts','lib/value/owner-earnings.ts','lib/value/config.ts','lib/value/return-model.ts','lib/value/tests/economics.ts','lib/value/buy-price.ts','lib/value/investment-nav.ts']
seal={'frozenAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'baseline':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'files':{n:hashlib.sha256((r/n).read_bytes()).hexdigest()for n in files},'production':{n:hashlib.sha256(Path(n).read_bytes()).hexdigest()for n in sources},'productionDiff':subprocess.check_output(['git','diff','--stat','--','lib','components','scripts'],text=True)}
assert not seal['productionDiff'];(r/'phase-1-freeze.json').write_text(json.dumps(seal,indent=2)+'\n');print(seal['frozenAt'],'PHASE 1 FROZEN')
