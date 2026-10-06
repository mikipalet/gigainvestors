from pathlib import Path
import csv,json,datetime
ROOT=Path(__file__).resolve().parents[2];HERE=ROOT/'research/rules';OUT=HERE/'outputs'
read=lambda n:list(csv.DictReader((OUT/n).open()))
def table(headers,rows):return '\n'.join(['| '+' | '.join(headers)+' |','|'+'|'.join(['---']*len(headers))+'|']+['| '+' | '.join(str(x).replace('|','/') for x in r)+' |' for r in rows])
def pct(s):return 'unavailable' if s in [None,''] else f'{float(s)*100:.2f}%'
rank=read('audit-ranked-rules.csv');current=read('audit-current-10y.csv');losers=read('audit-losing-quality-passers.csv');coverage=json.loads((OUT/'audit-coverage.json').read_text())
text='''NOT

The phase-1 rule audit is complete; no production rule has been changed and no candidate has passed the owner's ship gate yet. Two mechanisms merit frozen experiments: operating-margin variation can reject a single recovered dip, and the moat test permanently compares FY2023 with FY2019–20 even when margins have recovered. Other return, cash, dilution and financial-path concerns are documented without assuming that a famous stock's success invalidates every failed test.

This is research on restated, surviving companies, not proof of an investable historical advantage. US 2016–2026 is contaminated. The baseline is value-rules at 78141da (method 3.4.0), including the approved sustained-improvement exception; it is not the older released 3.3.0 baseline. Phase 2, method 3.5.0, the full unit suite, build, ordinary local export and five-company browser gate are pending.

'''
text+=f'Written {datetime.datetime.now(datetime.timezone.utc).isoformat()}. Historical coverage: {coverage}. Current exact-input screens: {len(current)}. Missing reporting/trading FX pairs are excluded from numeric prediction diagnostics, not treated as passes.\n\n'
text+='## Ranking and predictive associations\n\nA rejected top-decile winner is a false-negative proxy; a passing negative-return company is a false-positive proxy. Neither alone proves poor business judgement. Counts overlap across gates and repeat companies/quarters; ranking is descriptive, not a threshold-selection objective. Three-year return uses next-session entry and dividends, training outcomes mature by 2015-12-31, later signals start 2016Q1 with only mature horizons. Hit is beating that quarter’s universe median, averaged equally across quarters. Non-US ranks use local total returns as in research-1.\n\n'
for scope in ['US','Western_nonUS','all_nonUS']:
 for period in ['train','later']:
  rows=[r for r in rank if r['scope']==scope and r['period']==period and ': ALL ' not in r['rule']]
  text+=f'### {scope} {period}'+(' — CONTAMINATED' if scope=='US' and period=='later' else '')+'\n\n'
  text+=table(['Subtest','Top-decile failures','Negative-return passes','Pass hit','Fail hit'],[[r['rule'],r['winner_failures'],r['loser_passes'],pct(r['pass_hit']),pct(r['fail_hit'])] for r in sorted(rows,key=lambda r:-int(r['winner_failures']))[:12]])+'\n\n'
text+='The full ranking including every observed subtest, pass/fail/unknown denominators and bank/insurer breakdown is retained in `research/rules/outputs/audit-subtest-predictiveness.csv` and `audit-ranked-rules.csv`. An unobserved branch has no estimable predictive contrast; valuation inputs and informational flags are not independent pass/fail decisions. This is explicitly unavailable rather than an invented hit rate.\n\n'
text+='### All five tests\n\n'
text+=table(['Scope','Period','Test','Pass N','Fail N','Pass hit','Fail hit'],[[r['scope'],r['period']+(' contaminated' if r['scope']=='US' and r['period']=='later' else ''),r['rule'].split(': ALL ')[-1],r['passed'],r['failed'],pct(r['pass_hit']),pct(r['fail_hit'])] for r in rank if ': ALL ' in r['rule']])+'\n\n'
text+='## Iconic and other current cases\n\nTen-year outcome: next local session after 2016-09-30 to 2026-09-30, dividend-adjusted, ranked separately within covered US and non-US. “Excellent current economics” is a disclosed audit proxy: economics passes and both latest and median capital return are at least 15%. It is not a new investment rule. Complete screening results, including all nonqualifying names and failure reasons, are in `audit-current-10y.csv`.\n\n'
strong=[r for r in current if r['top_decile_10y']=='True' and r['excellent_current']=='True' and r['quality']!='PPPPP']
text+=table(['ID','10y total return','Current quality U/M/E/M/A','Median/latest capital return','Failed reasons'],[[r['id'],pct(r['return_10y']),r['quality'],pct(r['median_return'])+' / '+pct(r['latest_return']),r['reasons']] for r in strong])+'\n\n'
text+='Additional familiar cases (a high stock return alone does not meet the excellent-current-economics definition):\n\n'
ids={'NVDA.US','NFLX.US','AVGO.US','META.US','MSFT.US','AMZN.US','GOOGL.US','FTNT.US','WBD.US'}
text+=table(['ID','Top-decile 10y','10y return','Quality','Failure reasons'],[[r['id'],r['top_decile_10y'],pct(r['return_10y']),r['quality'],r['reasons']] for r in current if r['id'] in ids])+'\n\n'
text+='NVDA’s published ten-margin series is 33.05%,32.47%,26.07%,27.18%,37.31%,15.66%,54.12%,62.42%,60.38%,65.21%. Raw CV is 0.404; holding only the recovered trough at its preceding margin gives 0.333. Its FY2023 gross margin is 56.93% versus FY2019/20 mean61.60%, a 4.67pp decline; the latest margin is74.67%. These are mechanism diagnostics, not a selected trading strategy. Raw observed values and existing price conservatism must remain visible.\n\n'
text+='### Losing quality passers\n\nThese are investments that passed every quality gate and then lost money; their later loss is not itself proof that the business was weak at entry. The full list includes whether the unchanged price gate also allowed a buy. One company appears only once below (worst observed three-year cohort), to expose names rather than repeated-quarter counts.\n\n'
seen=set();examples=[]
for r in sorted(losers,key=lambda r:float(r['return_3y'])):
 if r['id'] not in seen:examples.append(r);seen.add(r['id'])
text+=table(['ID','Quarter','Kind','3y total return','Also BUY'],[[r['id'],r['quarter'],r['kind'],pct(r['return_3y']),r['buy']] for r in examples[:25]])+'\n\n'
text+='The documented WBD/Discovery 2018Q2 case is a concrete weak verdict beyond a later price decline: a completed acquisition materially changed the debt/cash position while annual balances could still feed valuation. Research-1 reports five-year total return −54.27% and subsequent drawdown −91.32%; current replay does not exactly reproduce the original valuation. A generic acquisition veto hurt performance there, so no such veto is authorized by this audit.\n\n'
text+='## Proposed scope after this audit\n\nTest only a recovered-dip exception for understandable and a rolling recent-versus-typical gross-margin check for moat. Freeze their exact parameters and changelog before opening candidate returns. Evaluate individually and jointly. No ROIC, cash conversion, dilution, financial, accounting, growth, margin-of-safety or expected-return threshold relaxation is supported merely by the associations above. Their documented one-year/path asymmetries require specific economic evidence before changing an owner-cost or capital-protection rule.\n\nThe fixed ship test is each fix’s US training and international both-period CAGR no more than0.25pp below baseline, drawdown no more than2pp worse, plus newly passing records not dominated by negative-return cases. Full counts and below-median outcomes must accompany any decision; a zero selection change alone cannot establish a quality improvement. US later outcomes cannot select fixes. No new buy can bypass the unchanged value/price and expected-return gate.\n\n'
text+='## Complete source inventory\n\n'+(HERE/'audit-inventory.md').read_text()
(HERE/'phase-1-report.md').write_text(text)
target=Path('/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/rules-1-report.md');target.write_text(text)
print('Phase-1 report written; strong rejected ten-year winners:',len(strong));print([(r['id'],r['quality']) for r in strong])
