"""Build the controller report from saved measurements and verification receipts."""
from pathlib import Path
import csv,json
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent;O=HERE/'outputs'
read=lambda name:json.loads((O/name).read_text())
port=read('portfolios.json');decision=read('decision-metrics.json');quality=list(csv.DictReader((O/'quality-summary.csv').open()))
proof=read('publication-proof.json') if (O/'publication-proof.json').exists() else None
browser=read('browser-semantics.json') if (O/'browser-semantics.json').exists() else []
visual=read('browser-layout.json') if (O/'browser-layout.json').exists() else []
ready=bool(proof and proof.get('verification_passed') and len(browser)==11 and all(x['pass'] for x in browser) and visual and not any(x['issues'] for x in visual) and decision['performance_gate_passes'])
lines=['READY' if ready else 'NOT','', '# Understandable: sustained improvement, method 3.4.0','',
('All required gates pass.' if ready else 'Not ready to ship: the numerical and unit gates pass, but the required broad browser gate remains red (20 of 38 states in the candidate run). It reports 12px controls, mobile drawer whitespace above its 15% limit, and one first-load script error/interaction timeout. The script error did not recur in three explicit Netflix rechecks. No publication was performed.'),'',
'''The fixed non-inferiority gate passes in every required group: CAGR and drawdown differences are exactly 0.00 percentage points because the redesign changes no historical BUY selections. This is a principle-based quality correction, not evidence of improved investment performance. In particular, worldwide later-period newly passing records include 14 negative-return observations and no additional top-decile winners. US 2016–2026 is contaminated and excluded from the decision.

The production method and explanatory surfaces are updated on `value-understand`. There has been no push or publication, no EODHD call, and no write to the live corpus or daily-runner lock. All export and browser work uses an independent local copy. The original live-check implementation is unchanged.

## Rule frozen before evaluating returns

Keep the existing operating-margin CV cutoff of 0.35. A higher CV may pass with a complete, consecutive window of the existing 7–10 annual observations, strictly positive finite operating margins, finite nonnegative net income in every year, and either:

1. Margins never decrease and the final margin exceeds the first; or
2. OLS slope is positive, R² ≥ 0.90, residual population standard deviation divided by mean margin ≤ 0.35, OLS slopes in both nonoverlapping chronological halves are positive, and the latest margin is at least the preceding margin. The first half has floor(n/2) observations.

The only new cutoff is R² ≥ 0.90, chosen from the principle that at least nine tenths of variation must be systematic improvement and at most one tenth noise. It was not fitted to returns. Missing years, missing values, operating losses, net losses, sign changes, and a latest decline disqualify the exception. The old low-CV path and all other thresholds—including the existing revenue-decline and loss-count checks—remain unchanged. The rule does not newly admit declining or loss-making histories. Financial-company tests, two-quarter LTM confirmation, raw CV, cyclical classification, valuation calculations and price discounts are unchanged. Existing publisher visibility rules expose some previously hidden values, detailed below.

The initial written rule at 22:38 UTC was strictly monotonic. At 22:45 UTC, before any candidate portfolio, hit-rate, winner or loser outcomes were opened, it was amended to cover the explicitly requested trend-consistent case. A preliminary current screen had found zero changes, and an incomplete numeric-only historical replay had run. Both the superseded draft and final rule are retained. This is disclosed rather than presented as an untouched first draft. The scope was also clarified before returns to require both worldwide and all-non-US interpretations of “all markets”. Returns were first opened at 22:56:43 UTC. The final candidate hash remained `d7e49409c26c3c99354e4e981b7a8360f0c8762da5b87314bbdc06002917d84c` through implementation; production parity is recorded in `outputs/implementation-parity.json`.

Pre-evaluation records: `research/understandable/protocol.json`, `README.md`, `freeze-final.json`, `freeze-evaluation.json`, and `docs/understandable-method-changelog.md`. The implementation changelog also appears in `lib/value/method-version.ts` (3.4.0).

## Measurement and coverage

The measurement comes from research-1 on `value-research` at `b1d578b`: its analyzer and corrected local-session portfolio function are retained in `research/understandable/research1-*.py`. The analyzer's root is parameterized; the adapter evaluates only this candidate, not the fair-value shadow track. Dividend-adjusted prices, each security's next local-session closing entry, quarterly liquidation/reentry, 10 bp per side, cash between entry dates and for missing allocations, and zero cash yield are retained. Portfolios are in USD; the original international single-security hit rates/ranks use local-currency total returns.

Training portfolio signals are 2005Q1–2015Q3, with outcomes ending by 2015-12-31; 2015Q4 is embargoed. Later signals are 2016Q1–2026Q2, ending 2026-09-30. Three-year training cohorts must mature by 2015-12-31; later hit rates use only mature cohorts. Hit rates are equal-weight means of quarterly pass/fail hit rates against that quarter's universe median. “Winner” means top decile within that scope and quarter. “Loser” means a negative three-year total return; below-median counts are also provided. Counts are company-quarter records, not independent companies.

The paired replay covers 2,058 identities and 99,691 stored rows: 93,961 paired, 158 unavailable snapshots, and 5,572 reporting/trading-currency mismatches. There are zero execution errors and 107 changed quality records over the full history, with no other quality gate or BUY changes. Missing snapshots retain the authoritative stored row in both variants. A separate currency-invariant numeric audit checked all 5,572 mismatches and found zero understandable changes and zero possible new buys; its artificial FX=1 was never used for investment returns or valuation. Extended cached international inputs are archived for reproduction.

This remains a restated-data research exercise, with the survivorship, source coverage, filing-date assumptions, current classifications, and non-point-in-time bond/FX limitations of research-1. Missing allocation counts are equal in both variants: paired US 0/0, Western non-US 2/0, all markets 37/348 (train/later); missing allocations remain cash. No market-data acquisition occurred.

## Portfolio CAGR and maximum drawdown

These are authoritative stored-baseline portfolios and their stored-anchored redesign. Both columns are shown even when identical. The stored US results exactly reproduce research-1. Western means its direct-listing venue set, excluding US-country companies; worldwide includes US, with all non-US separately required as a conservative scope check.

| Scope | Period | Baseline CAGR | Redesigned CAGR | Baseline max DD | Redesigned max DD |
|---|---|---:|---:|---:|---:|''']
labels={'US':'US','Western_nonUS':'Western non-US','all_markets':'All markets','all_nonUS':'All non-US'}
for scope in labels:
 for period in ['train','later']:
  get=lambda v:next(r for r in port if (r['scope'],r['period'],r['variant'])==(scope,period,v))
  b,c=get('stored'),get('stored_anchored');label='2005–2015' if period=='train' else '2016–2026'+(' **CONTAMINATED**' if scope=='US' else '')
  lines.append(f"| {labels[scope]} | {label} | {b['cagr']*100:.2f}% | {c['cagr']*100:.2f}% | {b['max_drawdown']*100:.2f}% | {c['max_drawdown']*100:.2f}% |")
lines+=['','The decision also uses same-input paired replays to isolate the rule. These differ from stored rows because of pre-existing replay/restatement drift; the drift is not attributed to the candidate. Paired baseline and redesign are again identical:','', '| Scope | Period | Paired baseline = redesign CAGR | Paired baseline = redesign max DD |','|---|---|---:|---:|']
for r in port:
 if r['variant']=='baseline':lines.append(f"| {labels[r['scope']]} | {r['period']}{' (contaminated)' if r['contaminated'] else ''} | {r['cagr']*100:.2f}% | {r['max_drawdown']*100:.2f}% |")
lines+=['','The fixed gate is CAGR ≥ baseline −0.25pp and drawdown no worse by >2pp. Every required paired gate passes at 0.00pp/0.00pp, and stored-anchored comparisons corroborate unchanged selections. No return threshold was changed after evaluation. All per-quarter paths and selection changes are saved in `outputs/portfolios.json`, `path-*.json.gz`, `historical-changes.csv`, and `decision-metrics.json`.','', '## Pass versus fail hit rates','', '| Scope | Period | Baseline pass / fail | Redesigned pass / fail | Pass / fail observations, baseline → redesigned |','|---|---|---:|---:|---|']
for scope in labels:
 for period in ['train','later']:
  get=lambda v,s:next(r for r in quality if (r['scope'],r['period'],r['variant'],r['state'])==(scope,period,v,s))
  bp,bf,cp,cf=[get(v,s) for v,s in [('baseline','P'),('baseline','F'),('redesigned','P'),('redesigned','F')]]
  lines.append(f"| {labels[scope]} | {period}{' (contaminated)' if scope=='US' and period=='later' else ''} | {100*float(bp['hit']):.3f}% / {100*float(bf['hit']):.3f}% | {100*float(cp['hit']):.3f}% / {100*float(cf['hit']):.3f}% | {bp['observations']} / {bf['observations']} → {cp['observations']} / {cf['observations']} |")
lines+=['','Unclear observations are excluded from pass/fail comparisons and retained separately in `quality-summary.csv`; quarterly denominators are in `quality-by-quarter.csv`. These associations do not establish predictive improvement.','', '## Newly passing winners and losers','', '| Scope | Period | New pass records (companies) | With observed 3y return | Additional top-decile winners | Additional negative-return losers | Below median | New BUYs |','|---|---|---:|---:|---:|---:|---:|---:|']
for r in decision['new_passes']:lines.append(f"| {labels[r['scope']]} | {r['period']}{' (contaminated)' if r['scope']=='US' and r['period']=='later' else ''} | {r['new_pass_records']} ({r['unique_companies']}) | {r['observed']} | {r['top_decile']} | {r['losers']} | {r['below_median']} | {r['new_buys']} |")
lines+=['','Worldwide top-decile understandable passes rise from 617 to 619 in training, and remain 1,766 later. US stays 363/578 (train/later); Western non-US stays 273/834; all non-US rises 281→284 in training and stays 1,211 later. Counts differ across scopes because top-decile cutoffs differ. Three later US records newly pass all five quality gates, but none passes the separate price check.','', '## Every changed current verdict','', 'All nine rows below change understandable **fail → pass**. All qualify through the trend-consistent branch: R² ≥90%, positive trends in both halves, no latest decline, positive margins, no net loss years, complete consecutive history, and residual CV ≤0.35. Raw CV is unchanged and still controls the existing volatile/cyclical price treatment.','', '| ID | Company | Raw CV | Trend R² | Residual CV | First → latest margin | Overall quality effect |','|---|---|---:|---:|---:|---:|---|']
for r in read('current-screen.json')['changes']:
 series=r['series']['operatingMargin'];m=[v for _,v in series];n=len(m);avg=sum(m)/n;center=(n-1)/2;slope=sum((i-center)*(v-avg) for i,v in enumerate(m))/sum((i-center)**2 for i in range(n));var=sum((v-avg)**2 for v in m)/n;res=sum((v-avg-slope*(i-center))**2 for i,v in enumerate(m))/n
 lines.append(f"| {r['id']} | {r['name']} | {r['cvAfter']:.3f} | {(1-res/var)*100:.2f}% | {res**.5/avg:.3f} | {series[0][0]}: {m[0]*100:.2f}% → {series[-1][0]}: {m[-1]*100:.2f}% | {'Fail → pass; price still fails' if r['id'] in ['NFLX.US','1209.HK'] else 'Still fails another quality gate'} |")
lines+=['','NFLX and STRL include the existing confirmed LTM observation through June 2026. The full numeric series and per-company reasons are in `outputs/current-screen.json`; exact published field and verdict differences are in `publication-proof.json`. No changed ID belongs to the explicit verdict-freeze list.','', '## Local export and browser proof','',
'''The first ordinary `publish --out` on the independent copy preserved all current test verdicts; 73 dossiers differed only in methodVersion. The initial candidate export correctly refused six pipeline-26 analyses. That rejection is retained, not bypassed. The existing pipeline-27 change (25eca9a: rolling-LTM numeric evaluation) was replayed on those six companies' saved inputs for **both** comparison arms, with cached filing answers and judgement attachment. All five numeric tests were reevaluated; unrelated quality verdict changes were checked and none occurred. No pipeline version was stamped without this numeric migration, and the publisher guard remains unchanged.

The baseline/candidate comparison is therefore within the same current pipeline. Relative to the released snapshot, the required migration also changes some moat/economics numeric details on those six IDs, plus NFLX understandable LTM details; these are explicitly separated from the redesign, not hidden as understandable-only effects. `pipeline-refresh.json` identifies the six records, and `released-to-final.json` enumerates every released-to-final field change. The controlled baseline→candidate export changes nine understandable tests and the existing publisher presentation effects detailed below. This does not meet the initial expectation of literally understandable-only dossier fields; no such claim is made. Full frozen records and history/forward/price files remain identical. Both exports use the ordinary CLI, no force flag, cached return data, and a network-denying preload.

The corpus copy contains 527,319 independent files (20,923,791,011 logical bytes), excluding credentials, git state and locks. Source symlinks were dereferenced into ordinary destination files. The compressed manifest contains every copied source hash. This is a controlled persisted-input method comparison, not a fresh all-provider acquisition or wholesale nightly normalization run.''']
if proof:
 lines += ['',f"Verified: {proof['before_dossiers']:,} dossiers before and after; {len(proof['changed_dossiers'])} controlled dossier changes; {sum(c['test']=='understandable' for c in proof['changed_verdicts'])} understandable verdict changes plus {sum(c['test']=='price' for c in proof['changed_verdicts'])} newly displayed failing price checks; {len(proof['frozen_differences'])} frozen differences; {len(proof['protected_file_changes'])} history/forward/price file changes. Method {proof['method_version']}. Exact files/index effects are in `publication-proof.json`."]
lines+=['',"Additional current price-verdict disclosures (both explicitly listed; neither is a BUY):",'',"| ID | Previous displayed price check | New displayed price check | Reason |","|---|---|---|---|","| STRL.US | Absent | Fail | Changing its analysis releases the byte-identical coverage baseline; the ordinary publisher exposes the already stored valuation. Margin of safety is −592.38%. |","| IDT.US | Absent | Fail | Same coverage-baseline release, exposing the already stored valuation. Margin of safety is −77.72%. |",'',"LRN's stored valuation is also newly visible, but its price verdict stays fail. The underlying version, currency, discount rate, growth, bond yield, share count and per-share values match the archived original analyses exactly. These are visibility changes, not a valuation-model or fair-value-shadow change. Five companies (KOG, FTNT, 0291.HK, STRL, IDT) move from three to four quality passes, so the existing researchCoverage rule reveals cached judgement explanations on their other tests without changing those verdicts. The comparison also records method-version updates, ordinary price-story timestamps and memo changes. Every field is retained in the proof; an explicit expected-effect classifier rejects anything beyond these explained changes.",'',"The numerical and verdict-enumeration parts of the fixed owner ship rule pass: all required CAGR/drawdown comparisons pass and all current verdict changes (nine quality changes, two newly visible failing price checks, two aggregate quality improvements, zero BUY changes) are enumerated. The complete delivery is nevertheless NOT ready because the required broad browser gate fails. The ordinary export also has explained presentation effects beyond the anticipated understandable-only fields. These are not silently waived. Shared UI repair and a clean browser gate are required before READY; no threshold retuning is indicated."]
if (O/'released-to-final.json').exists():
 released=read('released-to-final.json')
 lines+=['',f"Released-to-final dossier count: {released['changed_dossier_count']}. Nine substantive dossier IDs are listed above; the other 73 change only methodVersion. Full list of these 73 version-only IDs:",'',', '.join(c['id'] for c in released['changes'] if all(d['field']=='methodVersion' for d in c['fields']))+'.']
if (O/'browser-baseline-layout.json').exists():
 baseline_visual=read('browser-baseline-layout.json')
 lines+=['',f"Baseline browser control (FTNT and KOG at both viewports): {sum(bool(x['issues']) for x in baseline_visual)}/{len(baseline_visual)} states fail the same broad gate. Its exact issues and mobile raster whitespace percentages are retained in `outputs/browser-baseline-layout.json`. Baseline failures explain the existing UI debt but are not treated as a passed mandatory gate."]
lines+=['',f"Browser semantic evidence: {len(browser)} completed checks (target: ten company/viewport checks plus the unchanged local live-check). Layout evidence: {len(visual)} states; {sum(bool(x['issues']) for x in visual)} failing states. Five changed companies: NFLX.US, FTNT.US, STRL.US, IDT.US, KOG.OL, at 1728×970 and 390×844. The semantic audit checks actual rendered tile/drawer verdicts, rule explanations, series, numbers and thresholds against exported dossiers. Screenshots and layout results are retained locally and summarized in `outputs/browser-layout.json`.",'',
'''Full unit suite: **237 files passed; 2,323 tests passed, one skipped**. Nineteen focused rule/display tests cover monotonic and noisy rising paths, plateaus, declines, sign changes, loss years, missing observations, gaps, duplicate years, unchanged gates and the frozen R² boundary. The original 13 synthetic measurement checks also passed. `verify.py` confirms original US baseline parity, unchanged other gates and the frozen candidate hash. Production sources for valuation, LTM confirmation, verdict freeze, live-check and runner were not changed.

## Controller commands

All commands run in `~/data/value-understand`; check `df -h / ~/data` before each phase and stop with a commit below 4 GiB. The research-1 input archive remains at `~/data/value-research`. Do not run a publish command without `--out`. No command below publishes or pushes.

```sh
cd ~/data/value-understand
df -h / ~/data
python3 research/understandable/prepare.py
VALUE_NO_EODHD=1 NODE_OPTIONS=--max-old-space-size=768 node --conditions=react-server --import tsx research/understandable/replay.ts
python3 research/understandable/evaluate.py
python3 research/understandable/verify.py
VALUE_NO_EODHD=1 node --conditions=react-server --import tsx research/understandable/audit-unpaired.ts
VALUE_NO_EODHD=1 node --conditions=react-server --import tsx research/understandable/current.ts
npm test -- --maxWorkers=2
python3 research/understandable/copy-corpus.py
export VALUE_CORPUS_DIR="$PWD/.audit/understandable/corpus"
export VALUE_NO_EODHD=1
export NODE_OPTIONS="--max-old-space-size=1536 --require=$PWD/research/understandable/no-network.cjs"
node --conditions=react-server --import tsx research/understandable/refresh-pipeline.ts
node --conditions=react-server --import tsx scripts/value/cli.ts publish --out="$PWD/.audit/understandable/baseline-store"
node --conditions=react-server --import tsx research/understandable/stage-current.ts
node --conditions=react-server --import tsx scripts/value/cli.ts publish --out="$PWD/.audit/understandable/redesigned-store"
python3 research/understandable/compare-proof.py
python3 research/understandable/released-diff.py
```

Use fresh output directories, or the ordinary CLI's `--overwrite` only on an existing local snapshot after preserving its receipt. Do not overwrite the live publish repository. The copy helper resumes existing files and is not a reset of already modified analyses; `refresh-pipeline.ts` restores the archived nine analyses before migration.

In a separate local terminal (omit the network-denying Node preload because Next must serve HTTP; the store is local):

```sh
VALUE_STORE_DIR="$PWD/.audit/understandable/redesigned-store" NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=1536 node_modules/.bin/next dev --webpack --hostname 127.0.0.1 --port 3048
```

Then:

```sh
NODE_OPTIONS=--max-old-space-size=768 node --import tsx research/understandable/browser-proof.ts
QA_VIEWPORTS=1728x970,390x844 QA_BUTTONS='[data-testid="tile-understandable"] .tile-open' VALUE_MIN_FREE_GB=4 NODE_OPTIONS=--max-old-space-size=768 node scripts/value/release-gate.mjs http://127.0.0.1:3048 .audit/understandable/browser /s/nflx.us,/s/ftnt.us,/s/strl.us,/s/idt.us,/s/kog.ol
cp .audit/understandable/browser/report.json research/understandable/outputs/browser-layout.json
python3 research/understandable/report.py
git diff --check
```

Stop the local server after checking. No live rollout is performed by this task. The commit message is `value: understandable test stops punishing improving margins`; find the commit with `git log -1 --format='%h %s' value-understand`.''']
path=ROOT/'.superpowers/sdd/2026-09-29-value/understand-1-report.md';path.parent.mkdir(parents=True,exist_ok=True);path.write_text('\n'.join(lines)+'\n');print(path,lines[0])
