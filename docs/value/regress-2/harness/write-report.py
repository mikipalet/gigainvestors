import json
from pathlib import Path
r=Path('/Users/miki/data/regress/run2');e=r/'evidence';d=Path('docs/value/regress-2')
read=lambda p:json.loads(p.read_text())
p=read(e/'verification.json');a=read(e/'release-audit.json');b=read(e/'browser-comparison.json')
assert p['passed']and b['pass']
body=f'''READY

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
| Full unit suite | PASS — {p['unitFiles']} files, {p['unitPassed']} tests passed, {p['unitSkipped']} skipped |
| Production build | PASS, including TypeScript |
| Ordinary `publish --out` | PASS — 3,910 indexed companies, 3,915 dossiers |
| REAL publish harness | PASS — ordinary production command, calibration and exact approved-manifest Buy invariant; local bare remote and stub Blob only |
| Blob integrity | PASS — {p['blobFiles']} files, {p['blobBytes']:,} bytes, byte-for-byte equal to the committed local snapshot |
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
- **R1 shares:** {a['shareReviewCount']} previously published valuations keep their published
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
  {b['counts']['preExisting']} pre-existing overlap findings plus previously accepted
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

Minimum recorded free space was {p['minimumFreeBytes']['/']/1024**3:.3f} GiB on `/`
and {p['minimumFreeBytes']['/Users/miki/data']/1024**3:.3f} GiB on `~/data`; the 4 GiB
stop floor was never crossed. Scratch corpus/baseline/candidate copies, the local
bare remote and Blob store, build/dependency outputs and task caches are removed
at handoff. The worktree and review/release artifacts remain. No controller
commands below were executed by this task. Held quote freshness and unchanged
source/archive hashes remain enforced when the controller executes them.

'''
body+=(d/'review-evidence.md').read_text()+'\n'+(d/'controller-commands.md').read_text()
(d/'report.md').write_text(body)
external=Path('/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/regress-2-report.md')
external.parent.mkdir(parents=True,exist_ok=True);external.write_text(body)
