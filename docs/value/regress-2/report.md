READY

# regress-2 — release bundle converges

Controller rulings R1–R6 are applied generally. This is a reviewed local release
bundle, not an external publication. No external push, EODHD request or fresh Jev
reading occurred. The live corpus stayed read-only; the daily-runner lock and
live publish.hold were not opened or modified. No subagents were used.

The release commit is recorded in `/Users/miki/data/regress/release-bundle/manifest.json`
as `codeCommit`, with message `value: release bundle converges`. The worktree is
`/Users/miki/data/regress/repo`, branch `value-int10`, based on `2cc6a96`.

| Final gate | Result |
|---|---|
| Full unit suite | PASS — 250 files, 2428 tests passed, 1 skipped |
| Production build | PASS, including TypeScript |
| Ordinary `publish --out` | PASS — 3,910 indexed companies, 3,915 dossiers |
| REAL publish harness | PASS — ordinary production command, calibration and exact approved-manifest Buy invariant; local bare remote and stub Blob only |
| Blob integrity | PASS — 6251 files, 211,205,070 bytes, byte-for-byte equal to the committed local snapshot |
| Local post-publish | PASS — production verifier, quarter-back and 2018Q3 browser checks, no page errors, pending receipt cleared |
| Browser | PASS — 128 candidate states on ALSN/FCN/NFLX/MCD/CFRUY, desktop 1728×970 and mobile 390×844; zero new findings |
| Input/archive binding | PASS — 571,351 bound inputs; 6,258 live archive files unchanged |

The isolated process namespace had loopback only, zero external routes, and a
read-only mount of the live corpus. The final implementation hashes match every
file bound before the final gates. Earlier failing/superseded attempts remain in
the evidence archive; only the final command exit receipts establish these gates.
An earlier local post-check rolled back scratch because its baseline prerendered
HTML referenced old immutable views absent from the new directory override. The
final build is bound to the candidate store, removing that harness mismatch;
production checks were not weakened.

## Policy closure

- **R1 balance:** choose the latest complete statement for the valuation method,
  falling back to an earlier interim or annual statement. No cross-period field
  filling and no invented zeros. Financial balance fields use exact cached SEC
  instant facts when available. A cached valuation tied to an incomplete quarter
  is recomputed against the complete statement.
- **R1 shares:** 189 previously published valuations keep their published
  denominator with an internal review flag and method note. New companies retain
  the strict corroboration rule. The only newly hidden valuation is **EXR.US**:
  published 221,052,600 shares versus issuer-filed 211,269,558 at 2026-07-24,
  a **4.6306%** discrepancy on the comparable common-stock basis. Evidence:
  [EXR 10-Q, accession 0001289490-26-000053](https://www.sec.gov/Archives/edgar/data/1289490/000128949026000053/0001289490-26-000053-index.html),
  cached `dei:EntityCommonStockSharesOutstanding`. MAS retains its prior basis,
  which is within 2% of its filing; disagreement with a new vendor denominator
  does not establish a contradiction of the published denominator.
- **Conservative retained valuations:** LPP.WAR, WN.TO, IBS.LS and FG.US keep their
  dated published valuation with a method note pending review of refreshed
  nonpositive owner earnings/book value. No claim is made that the new vendor
  figures are verified. Their exact dates/reasons are in `release-audit.json`.
- **R2 Buy:** exactly ALSN.US, FDJU.PA and FCN.US change Buy, matching every
  before/after tuple and margin in the existing approved manifest. GL, NTB, INMD
  and CFG-PH use complete-record preservation; NMIH remains wait under the
  normal strict checks and complete-balance fallback. No valuation or quality
  threshold was changed. The 151 explicit frozen dossiers are identical
  as parsed records to live.
- **R3 quality:** the eleven original eligibility transitions, their primary
  evidence and the CFG-PH Buy-preservation exception are listed below. The other
  non-Buy transitions proceed as ordinary source-bound nightly churn.
- **R4 explicit nulls:** all **53 unexplained** cells are restored/refreshed:
  FLG 29, RMNI 5, STLAM 4, LDOS 3, TRMB 2, and one each MAS, DVA, TPG, IIIN,
  PLXS, AVBH, SANM, KLIC, GH and RFL. Four formerly explained missing-price
  cells are also retained conservatively. Of the original 79 null transitions,
  57 are now numeric and only 22 remain null, each with exact filed nonpositive
  equity evidence. **Zero unexplained numeric→null cells remain.**
- **R4 absent cells:** all **6,209** were present in live, and all are restored
  or refreshed in the final candidate. This includes 41 fiscal-year keys whose
  measurement was already null on live. Periods are matched by fiscal key,
  never by shifted array position. Per-cell old/new evidence is included.
- **R5 overlaps:** 36 of the original 42 match live exactly. Two MCD chart/year
  combinations differ from the related live overlap and are conservatively
  treated as new and fixed; all four new CFRUY overlaps are fixed. General
  chart-caption spacing fixes the cause. The final checker still reports
  20 pre-existing overlap findings plus previously accepted
  12px controls/whitespace; none are relabelled as new passes. All original
  findings are listed in `browser-follow-up.md` for follow-up. The raw checker
  flags 108/128 states; the PASS is the controller-required comparison for new
  findings, not a claim that legacy/previously accepted findings vanished.
- **R6 cache:** all 88 failed cache bindings retain live state: 84 existing
  analyses (and available input records) match live hashes; ABEV.US, AEM.US,
  AZN.US and BUD.US are absent in live and remain absent. None of the 88 failed
  analyses is installed by the overlay.

There are no missing previously published dossiers; the only additions are the
16 held additions already documented in regress-1. The source overlay retains
the original 114,816 entries and excludes the failed analyses. Historical logs
omitted by the initial scratch-copy exclusion were restored from live only after
their 92 hashes matched the source manifest; controller copying includes them.

## Artifacts and boundaries

`/Users/miki/data/regress/release-bundle/` contains the installable corpus overlay,
final ordinary candidate, evidence archive, source/archive hashes, held quotes,
this report, controller commands and artifact hashes. `verification.json`,
`release-audit.json`, both numeric-resolution files, primary evidence, cache
receipts, browser comparison and full final gate logs are also committed under
`docs/value/regress-2/`. Screenshots and earlier attempts are in `evidence.tar.gz`.

Minimum recorded free space was 7.235 GiB on `/`
and 106.405 GiB on `~/data`; the 4 GiB
stop floor was never crossed. Scratch corpus/baseline/candidate copies, the local
bare remote and Blob store, build/dependency outputs and task caches are removed
at handoff. The worktree and review/release artifacts remain. No controller
commands below were executed by this task. Held quote freshness and unchanged
source/archive hashes remain enforced when the controller executes them.

# Controller evidence and remaining proposals

All evidence below comes from cached issuer filings/companyfacts and the bound
input snapshot. No new issuer reading, Jev call or EODHD request was made.
`input-evidence.json`, `quality-primary-evidence.json` and
`buy-primary-evidence.json` preserve the exact observations, tags, accessions,
periods and source gaps. A matching number under a different accounting concept
does not establish the required input.

## Proposed Buy list — not approved or applied

**NMIH.US: original wait→buy proposal, for controller consideration only.**
The management input is supported: diluted shares fell from 79,263,000 in FY2020
to 79,038,000 in FY2025, a five-year CAGR of −0.05684%. The existing five-or-ten-year
dilution test therefore passes; no threshold changed. The cached
[2025 10-K](https://www.sec.gov/Archives/edgar/data/1547903/000154790326000011/nmih-20251231.htm)
and earlier filed comparative observations bind these counts. The
[June 2026 10-Q](https://www.sec.gov/Archives/edgar/data/1547903/000154790326000038/0001547903-26-000038-index.html)
supports equity increasing from $2.591986bn to $2.705196bn. Its $3.634m intangible
amount is **including goodwill**, not a separately established goodwill amount.
The original regress-1 proposed range was $63.679860841674376 / $79.59982605209295 /
$106.13310140279059 at 35% required margin. That range is recorded for review,
not promoted into the approval manifest: complete-statement fallback and strict
share checks still apply, and the final candidate keeps NMIH at wait. Before
approving a future Buy tuple, reconcile the complete balance and denominator.

| Other transition reviewed | Primary-source finding | Disposition |
|---|---|---|
| GL wait→buy | [June 10-Q](https://www.sec.gov/Archives/edgar/data/320335/000032033526000216/0000320335-26-000216-index.html) matches $6.155815bn equity and $490.446m goodwill. The vendor's annual $6.999136bn “intangibles” instead matches **DeferredPolicyAcquisitionCosts**; the June intangible component is absent. Those facts do not substantiate the full proposed valuation increase. | Keep live wait; not proposed. |
| NTB wait→buy | [2025 20-F](https://www.sec.gov/Archives/edgar/data/1653242/000165324226000006/ntb-20251231.htm) supports annual $1.141851bn equity. The candidate's June $1.149bn equity, $27.284m goodwill, $91.272m intangibles and current share basis lack exact corresponding cached primary facts. | Keep live wait; not proposed. |
| INMD wait→buy | Cash changed $555.334m→$501.115m and debt $13.235m→$4.451m in vendor inputs. No matching cached primary facts support these changes. The cached annual-report metadata points to an unrelated 2011 issuer filing (CIK 885988); it is explicitly rejected as evidence. | Keep live wait; not proposed. |
| CFG-PH buy→wait | Replacing unsupported LTM2026 with FY2016 changes the median ROE window, 12.5628%→11.6922%. Cached issuer facts bind FY2016 $1.045bn income, $19.747bn equity and $6.876bn goodwill (accession 0000759944-17-000012); $971m vendor intangibles lacks an exact primary match. This preferred listing uses a parent/common proxy. [Current issuer filing](https://www.sec.gov/Archives/edgar/data/759944/000075994426000028/cfg-20251231.htm). | Keep the complete live Buy record; not proposed. |

Only ALSN.US, FDJU.PA and FCN.US remain in the approved change manifest.
Unapproved Buy transitions use the existing complete-record preservation path.
The explicit 151-ID freeze list is unchanged.

## Eleven five-test eligibility changes

The following lists the original regress-1 transitions. Ten are ordinary
non-Buy quality churn; CFG-PH's complete live record is preserved because its
transition would change Buy. Exact comparisons and primary matches are in the
JSON evidence; “pass/fail” below refers to the changed quality test.

| Company | One-line evidence and disposition |
|---|---|
| DVA | Management pass→fail: filed FY2025 outstanding shares 68.549m replace 88.1m, reducing fiscal capitalization $8.62129485bn→$7.78785189bn and the retained-earnings result; [10-K](https://www.sec.gov/Archives/edgar/data/927066/000092706626000012/dva-20251231.htm). Accept. |
| SBSI | Accounting pass→fail: refreshed filed loan/provision observations (16/16 exact matches, FY2025 provision $3.053m) move the peer loss excess count 2→4; [10-K](https://www.sec.gov/Archives/edgar/data/705432/000070543226000034/sbsi-20251231.htm). Accept. |
| BMI | Insufficient history→five passes: restored filing history and fiscal common-share observations replace the three-year window; the 37,221,098-share observation is bound to the applicable historical period, not asserted as today's denominator; [issuer 10-K](https://www.sec.gov/Archives/edgar/data/9092/000119312526054739/bmi-20251231.htm). Accept. |
| HON | Management fail→pass: filed 635.3m FY2025 shares × cached 0.9535 split factor = 605,758,550; all ten raw annual share observations match primary facts before adjustment; [10-K](https://www.sec.gov/Archives/edgar/data/773840/000077384026000013/hon-20251231.htm). Accept. |
| NMIH | Management fail→pass: filed diluted FY2020 79.263m→FY2025 79.038m gives −0.05684% five-year CAGR under the existing rule; [10-K](https://www.sec.gov/Archives/edgar/data/1547903/000154790326000011/nmih-20251231.htm). Accept quality only; Buy stays wait. |
| LAMR | Management pass→fail: ten-year acquisition spending $1.497561bn→$2.799066bn, with 10/10 exact filed PaymentsToAcquireBusinessesNetOfCashAcquired matches, against $3.808733bn net income and 14.9% recent ROIC; [10-K](https://www.sec.gov/Archives/edgar/data/1090425/000109042526000008/lamr-20251231.htm). Accept. |
| HCI | Insufficient history→five passes: restored filed history, including FY2025 outstanding shares 12,992,147 replacing 12,883,000, with all ten annual share observations matched; [10-K](https://www.sec.gov/Archives/edgar/data/1400810/000119312526076743/hci-20251231.htm). Accept. |
| VCTR | Accounting pass→fail: restructuring years 2→5; primary RestructuringAndRelatedCostIncurredCost includes 2023 $0.595m, 2024 $1.411m, 2025 $29.674m; [10-K](https://www.sec.gov/Archives/edgar/data/1570827/000119312526077057/vctr-20251231.htm). Accept. |
| NOVT | Accounting pass→fail: restructuring years 2→5; filed charges include 2023 $11.814m, 2024 $10.486m, 2025 $16.124m; [10-K](https://www.sec.gov/Archives/edgar/data/1076930/000119312526064230/novt-20251231.htm). Accept. |
| CFG-PH | Moat pass→fail: FY2016 replaces unsupported LTM2026, lowering median ROE below the existing threshold; income/equity/goodwill match primary facts but the intangible/proxy gap remains. Preserve live quality and Buy together under R2. |
| BOKF | Accounting pass→fail: peer loss excess count 4→5 after refreshed filed loans/provisions, 18/18 exact primary matches; [10-K](https://www.sec.gov/Archives/edgar/data/875357/000087535726000013/bokf-20251231.htm). Accept. |

The accepted transitions do not authorize additional Buy changes. Cached
filing/fundamental refreshes continue normally without per-company exceptions.

# Controller commands — execute only after READY

Not executed by this task. The three approved Buy changes are ALSN, FDJU and FCN;
the proposed list is not an approval manifest. Keep the live hold until both real
publication and post-publication verification succeed. Run from the existing
isolated worktree; no external code push is needed for this local controller.

The observed runner is a detached `run-daily.sh` scheduler in the `value-daily`
worktree. Its pause helper checks the process identity and requires an idle sleep
before sending STOP; resume sends CONT to those exact process start times. It
never reads, removes, acquires or repairs the daily-runner lock. This pauses and
resumes the existing scheduler, avoiding a replacement runner contending for its
lock. These are controller instructions, not actions performed in this task.

```bash
set -euo pipefail
cd /Users/miki/data/regress/repo
export TMPDIR=/Users/miki/data/regress/tmp
export npm_config_cache=/Users/miki/data/regress/tmp/npm-cache
mkdir -p "$TMPDIR"
bundle=/Users/miki/data/regress/release-bundle
report=/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/regress-2-report.md
stage=/Users/miki/data/regress/controller-corpus
backup=/Users/miki/data/regress/controller-backup
live=/Users/miki/value-corpus
daily=/Users/miki/GitHub/superinvestors-wt/value-daily
paused=/Users/miki/data/regress/controller-runner-paused.json
check_disk() {
  python3 -c 'import shutil; assert min(shutil.disk_usage(p).free for p in ["/","/Users/miki/data"]) >= 4*1024**3, "DISK STOP"'
}
check_disk
test "$(head -n 1 "$report")" = READY
python3 -c 'import json,sys; assert json.load(open(sys.argv[1]))["status"] == "READY"' "$bundle/manifest.json"

# 1. Stop the idle scheduler without touching its lock or the live hold.
python3 docs/value/regress-2/harness/controller-runner.py pause "$paused"

# Install the reviewed code into the already isolated nightly checkout.
release_commit=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["codeCommit"])' "$bundle/manifest.json")
git -C "$daily" diff --quiet
git -C "$daily" diff --cached --quiet
git -C "$daily" switch --detach "$release_commit"
npm ci --no-audit --no-fund

# 2. Independently stage the live corpus, then install the held additions/overlay.
# Exclusions avoid reading/copying the runner lock and hold. No live inputs change.
test ! -e "$stage"
mkdir -p "$stage"
rsync -a --exclude='/daily-runner*' --exclude='/publish.hold*' \
  --exclude='/backups' --exclude='/logs' "$live/" "$stage/"
check_disk
python3 docs/value/regress-1/harness/stage-bundle.py "$bundle" "$stage"
export VALUE_CORPUS_DIR="$stage"
export VALUE_STORE_DIR="$stage/publish-repo"
export VALUE_NO_EODHD=1
export NODE_OPTIONS=--max-old-space-size=2048
# This stage uses the real controller remote/Blob credentials, never test stubs.
# The reviewed quotes must still meet the normal freshness guard; expired quotes abort.
node --env-file="$daily/.env.local" --conditions=react-server --import tsx \
  docs/value/regress-1/harness/controller-held-prices.ts "$bundle"

# 3. Ordinary real publication, then the ordinary post-publish check.
check_disk
node --env-file="$daily/.env.local" --conditions=react-server --import tsx \
  scripts/value/cli.ts publish
node --env-file="$daily/.env.local" --conditions=react-server --import tsx \
  scripts/value/post-publish-cli.ts

# 4. Preserve overwritten live paths and install only after both commands pass.
test ! -e "$backup"
mkdir -p "$backup"
python3 - "$bundle" "$live" "$backup" <<'PY'
import json,shutil,sys
from pathlib import Path
bundle,live,backup=map(Path,sys.argv[1:])
for rel in json.loads((bundle/'manifest.json').read_text())['overlayFiles']:
    src=live/rel
    if src.is_file():
        dst=backup/rel; dst.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(src,dst)
shutil.copytree(live/'publish-repo',backup/'publish-repo')
PY
check_disk
tar --no-same-owner -xzf "$bundle/corpus-overlay.tar.gz" -C "$live"
rsync -a --delete "$stage/publish-repo/" "$live/publish-repo/"
test "$(git -C "$live/publish-repo" rev-parse HEAD)" = \
     "$(git -C "$stage/publish-repo" rev-parse HEAD)"

# 5. Only now remove the hold, then restart/resume the same scheduler.
rm "$live/publish.hold"
python3 docs/value/regress-2/harness/controller-runner.py resume "$paused"

# 6. Remove the controller scratch copy; keep the scoped backup and release bundle.
python3 - "$stage" <<'PY'
import shutil,sys
from pathlib import Path
p=Path(sys.argv[1]); assert p==Path('/Users/miki/data/regress/controller-corpus')
shutil.rmtree(p)
PY
```

If a command fails, stop. Keep the scheduler paused and the live hold in place;
inspect the publication receipt before retrying. Do not manually manipulate the
runner lock. No command above fetches EODHD or requests fresh Jev analysis.
