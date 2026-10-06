import json,collections
from pathlib import Path
r=Path.home()/'data/regress';e=r/'evidence';d=r/'repo/docs/value/regress-1'
def read(n):
 p=e/n;return json.loads(p.read_text())if p.exists()else None
replay=read('full-replay-summary.json');browser=read('browser-summary.json');secret=read('secret-scan.json');cleanup=read('cleanup.json');disk=[json.loads(s)for s in(e/'disk.jsonl').read_text().splitlines()];minimum={k:round(min(x['free'][k]for x in disk)/1024**3,3)for k in disk[0]['free']}
source=read('source-hash-summary.json');residual=read('residual-summary.json')
failed=sorted(set(replay['released']['failedIds']+replay['remaining']['failedIds']))
text=f'''NOT

The source-scale regression is repaired, but this full nightly replay is **not release-ready**. Keep `~/value-corpus/publish.hold` SET. The residual is not small: 776 unapproved audit entries across 427 companies, plus 6,209 removed numeric fields/period cells recorded separately. The real publish path rejects an unapproved Buy-now increase; the browser gate also remains red. This is a committed review checkpoint and a blocked release bundle, not authorization to publish.

Local branch: `value-int10`, isolated worktree `/Users/miki/data/regress/repo`. `value-calib` (`c8e934c`) was merged into `value-int10` (`a1c98d5`) in `b5a754f`. Final commit title: `value: nightly re-analysis keeps source scales; release bundle`. The bundle manifest records the final code commit separately.

Source archive: `9037c38327d6b688e95ffab6543610a57c2f9081`, 3,899 dossiers, 6,258 hashed files. The comparison uses the unchanged live archive authorized in this task, not a claimed successful nightly publication. The two supplied calib-1/int10 reports were read before implementation.

Implemented:

- Pipeline 29 distinguishes share units from XBRL decimal precision. Unit/thousand/million repairs require cross-year or independent same-period corroboration. Unreconciled scale/basis jumps are rejected; explicitly evidenced ADS/split conversions remain separate. Zero/absent observations do not erase valid share counts; zero revenue corrections do not overwrite valid revenue. Provenance retains units, precision and conversion evidence.
- Corrections cannot introduce an integrity-breaking adjacent-year jump into a coherent history. A single corrupt cached denominator can be repaired only when adjacent years corroborate the source. Reviewed conversions of the same accession remain intact. Foreign statement-currency conflicts cannot bypass checks through dimensionless share tags.
- Final cached completion now uses the existing capital-event-aware history retention, preventing a restored pre-split row from undoing a valid current share basis. Legitimate EMEIS recapitalization and EVN split histories remain supported.
- Date-only balance placeholders no longer supersede real statements. Partial real statements still retain unknowns; no missing debt/cash/intangibles are invented or backfilled from an older annual statement.
- Historical identities are retained for all emitted periods, including regenerated rows. Browser snapshot temporary paths respect TMPDIR.

MCD retains 30 analyzed years, WRB 30, GRMN 27 and CEG 14. All nine original scale-related raw valuation losses are restored: BRO, COP, EG, GRMN, HST, MCD, MRK.XETRA, VIVT3.SA and WRB. Eight are visible in the final public candidate; MRK.XETRA is independently blocked by its publication share check and remains in the residual list. BTAI, DOLE, KNTK and GDS also retain their recovered histories. IQ remains at five years: the cached ADR basis lacks independent ratio evidence, so no ratio was inferred from the discrepancy.

The copied input preparation installed 232 hash-verified accepted-held input files, kept 26 additions held, restored two exact cached report readings (AEG/NFE), and restored the archived identities of RACE.MI/STLAM.MI whose current index memberships still match. Previously published additions (97) moved to the release baseline with their **pre-run live hashes**; refreshed analyses were not frozen. The explicit freeze remains exactly 151 IDs. The 16 reviewed held quotes were staged through a price-only commit in the local bare harness; no live prices were changed.

Full nightly analysis proof:

| Scope | Requested IDs | Written | Unchanged | Failed |
|---|---:|---:|---:|---:|
| Released plus accepted additions | 3,915 | 32 | 3,882 | 1 |
| Remaining universe | 34,368 | 7,149 | 27,130 | 87 |
| Total | 38,283 | 7,181 | 31,012 | 88 |

Two requested IDs have no fundamentals and are not in the attempted-result totals. This is the final converged pass after the initial full pipeline-bump replay; unchanged fingerprints still pass through source correction/normalization. Both final jobs ran 2026-10-06 11:10:50 UTC through 11:19:19 / 11:40:42, with the same implementation SHA-256 `{replay['released']['implementationSha256']}` and `implementationUnchanged=true`. They used 5,717 exact matching cached readings. Both stages returned exit 1 for unavailable/changed cached readings; no full-analysis success is claimed. The only released failure is AERO.US, already explicitly frozen and preserved. The other 87 failures are outside this candidate's released scope. Failed results are excluded from the installable overlay. The complete IDs and receipts are in [full-replay-summary.json]({d}/full-replay-summary.json).

Verification:

| Gate | Result |
|---|---|
| Complete unit suite | PASS: 247 files; 2,415 tests passed, 1 skipped; exit 0 |
| Production webpack build | PASS: exit 0, including TypeScript and page generation; offline font fixture |
| Calibration through real publish | PASS: 10 TP, 17 TN, 0 FP, 0 FN, 0 unclear; LCID missing; 8 documented exceptions |
| Ordinary `publish --out` | PASS: exit 0, 3,915 dossiers, no missing archived company, exactly 16 additions, valid aliases |
| Explicit freezes | PASS: all 151 dossier records unchanged; freeze configuration unchanged |
| Approved changes | All nine understandable transitions present; ALSN/FDJU/FCN emitted tuples match the exact manifest |
| Real ordinary publish, local bare remote + stub Blob | BLOCKED: `index/US.json Buy-now changed 16 -> 17; prices and new dossiers explain at most +0/-2`; exit 1 before release commit/upload |
| Browser, ALSN/FCN/NFLX/MCD/CFRUY | FAIL: {browser['states']} states at 1728×970 and 390×844; {browser['rawFailedStates']} raw failed states; {len(browser['blockingFindings'])} unaccepted overlap findings |
| Diff whitespace | PASS |
| Live archive/hold/freeze | PASS: 6,258 files unchanged, no added files; hold and freeze hashes unchanged |

The browser's existing owner dispositions cover 231 exact named 12px shared-control findings and 81 whitespace findings. No threshold or approval was expanded. The remaining overlaps affect chart year/caption labels, chart endpoint labels and filing quote/source text. Screenshots and raw reports are retained. The final browser run used the verified unchanged build against the final candidate after restoring canonical identities; it did not use live data.

Residual approval list:

- **Quality:** 486 individual test transitions across 184 companies. Nine are owner-approved understandable changes; 477 transitions across 175 companies remain for review. Aggregate five-test eligibility changes for 13 companies: the approved changes are NFLX/1209.HK; the other 11 are DVA, SBSI, BMI, HON, NMIH, LAMR, HCI, VCTR, NOVT, CFG-PH and BOKF.
- **Buy:** eight transitions. ALSN, FDJU and FCN match the existing approval exactly. Remaining: GL, NMIH, NTB and INMD wait→buy; CFG-PH buy→wait. Exact before/after valuation, margin and test tuples are in the ledger.
- **Explicit numeric→null:** 79 cells across 22 companies. Primary facts explain 26 (22 nonpositive-equity book-value cells; four fiscal-end price-month gaps). Remaining 53 cells: FLG 29; RMNI 5; STLAM 4; LDOS 3; TRMB 2; one each MAS, DVA, TPG, IIIN, PLXS, AVBH, SANM, KLIC, GH, RFL.
- **Public valuation→null:** 241 companies. 190 are hidden by publication share checks; 51 are already unavailable in refreshed analysis, principally because latest-quarter components are incomplete. A guard explains suppression but does not prove the vendor data correct. Same-quarter primary observations, where cached, are preserved alongside the selected balance; examples include PGR's conflicting equity and absent debt components for ISRG/ANET/SAP. No missing component was guessed.
- **Absent numeric fields/periods:** 6,209 further numeric cells are absent rather than explicitly null. They remain unapproved in the separate conservative audit and are included in the source-input evidence; they are not hidden inside the explicit-null count.
- **Cached readings/browser:** 88 failed cache bindings and 42 unaccepted overlap findings must be addressed before a complete green proof. Do not obtain fresh Jev readings under this task's restrictions.

The complete per-company list is [residual-approval-list.md]({d}/residual-approval-list.md). [audit-classifications.json]({d}/audit-classifications.json) contains every explicit quality/buy/null classification and primary fact evidence; [candidate-numeric-removed.json]({d}/candidate-numeric-removed.json) records every absent numeric cell. The evidence bundle adds `changed-input-evidence.json`, `public-valuation-loss-evidence.json`, `balance-trace.json`, source-scale proofs, original/final replay receipts, full unit/build/publish/browser logs and screenshots. Earlier failed attempts are retained, including the initial missing canonical aliases and a retry-wrapper trailing-command error; individual final CLI logs/exit receipts, not the wrapper's exit, establish the results above.

Bundle: `/Users/miki/data/regress/release-bundle/manifest.json` remains **NOT**. It binds the scoped input/analysis overlay, candidate snapshot, reviewed quotes, baseline archive and source hashes. This review artifact deliberately cannot pass `stage-bundle.py`'s READY guard. Resolve the data and UI blockers, obtain exact residual approvals where appropriate, and rerun the proof before issuing a READY bundle; do not merely change the status field.

Controller commands are [controller-commands.md]({d}/controller-commands.md). They require a READY report/bundle, a paused managed runner, independent staging, ordinary publish and post-publish verification. They remove the **live** `publish.hold` only after the release publishes successfully, verifies, and installs. The commands were not executed. No runner lock was read, acquired, removed or recovered.

All work/builds/copies/browser profiles/temp files were under `~/data/regress`, with `TMPDIR=~/data/regress/tmp`. The live corpus was read-only, additionally mounted read-only for analysis/tests/publication/browser jobs; their network namespace had loopback only and external calls were rejected. No EODHD request, fresh Jev request, subagent, external push, external publication or revalidation occurred. Only explicit local-bare test transport was used. No secrets or full process argv were printed.

Minimum observed free space: root {minimum['/']} GiB; data {minimum['/Users/miki/data']} GiB. The 4 GiB stop floor was never crossed.

Secret scan: {json.dumps(secret) if secret else 'pending final bundle scan'}.

Cleanup: {'completed; full copied corpus, archive/candidate scratch copies, local bare/stub storage, dependencies, build output, browser profiles and temporary files removed. Only the isolated code worktree, review bundle and compact evidence remain.' if cleanup and cleanup.get('completed') else 'pending bundle completion; this report will be updated after removing task scratch copies.'}
'''
(d/'report.md').write_text(text)
report=Path('/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/regress-1-report.md');report.write_text(text)
print('Report written:',report)
