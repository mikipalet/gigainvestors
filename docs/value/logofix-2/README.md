READY

Recovery, bundle installation, full-stage preservation, ordinary local publication, both coverage baselines, full unit suite and production build all pass. Ready for controller release; no release command has been executed.

Merged `value-guard` commit `c4629521c1180892a07206258a2a0b4758dae113` into `value-logofix` (merge `892f684`). The empty coverage-approval manifest remains unchanged. No external push, deployment, real publication, live-corpus write, runner signal, or live daily-runner lock operation was performed. All scratch writes and TMPDIR are under `~/data/value-logofix`; runner tests use isolated fixture locks there.

Recovery and review

- Recovered all 154 originally reported demotions from `~/value-corpus/enrichment-v7/logos/runs/1791275081726-before.json`, cross-checked against the exact published URLs in data commit `9037c38327d6b688e95ffab6543610a57c2f9081`. The 142 existing legacy cache objects retain every original field/value; the 12 originally absent caches are absent again. No validator version, identity approval, timestamp, or normalized URL was invented for these records. Pre-run serialization is unavailable, so original object contents are exact; restored records have deterministic JSON serialization.
- The historical guard exposed one additional dossier-only demotion, `TLC.AU`, absent from the original index-derived list. Its pre-run `validated:true` legacy favicon cache exactly matches its archived dossier logo. It is also restored, making **155 historical states: 143 legacy cache records and 12 absent records**.
- `lib/value/logo-restorations.json` binds the historical facts to the archive and snapshot. The stage/publication lookup applies only while the current cache matches that precise pre-run state. A later changed cache, rejection or pending candidate cannot acquire that historical approval. It fills frozen null presentation fields without changing financial data.
- Ran the existing normal acquisition stage with `--only=<19 additions> --force` on isolated copied inputs: 19 checked, 16 new candidates, three unavailable. Visually reviewed all 19, including previous candidates for those three, using the existing image validation and identity rules. Replaced Dream Finders' navigation search icon, both ambiguous standalone Heineken Holding stars, and Peyto's isolated portrait with official header assets passed through the existing `stageBrand` validator. The complete Peyto official header includes its wordmark with the portrait. All 19 final candidates passed manual light/dark and 26px review. Exact asset hashes, source URLs and decisions are in `visual-review.json`; contact sheets are `review-0.png` and `review-10.png`.
- The 27 surviving logos-1 fallbacks remain monograms. The bundle includes all 28 original fallback entries, including the one no longer indexed, and all 1,137 previous approvals.

Bundle and installer

- Directory: `~/data/value-logofix/bundle-2/`.
- Portable archive: `~/data/value-logofix/logofix-2-bundle.tar.gz` (about 3.5 MiB).
- Manifest: `docs/value/logofix-2/bundle-manifest.json`; checksums: `docs/value/logofix-2/bundle.sha256`.
- Bundle has 155 historical entries plus 1,184 ordinary entries (1,137 original approvals, 19 new approvals, 28 original fallbacks). Record/file hashes bind the complete payload. All modern assets pass image hash/decoding checks through the existing installer. Recovery URLs remain exactly as archived.
- `scripts/value/install-logo-recovery.ts` requires the committed manifest, verifies every file and each historical state against committed evidence, preflights the complete ordinary bundle, rejects changed null targets, preserves newer non-null records, backs up changed caches, and restores original absent caches by removing only their matching demoted replacements. It refuses symlink paths and stops below 4 GiB. Apply requires the controller's paused runner PID; it never opens a runner lock. A partial filesystem failure is resumable; inspect the backup before continuing.

Read-only controller preflight:

```bash
cd "$HOME/data/value-logofix"
node --import tsx scripts/value/install-logo-recovery.ts \
  "$HOME/data/value-logofix/bundle-2" "$HOME/value-corpus"
```

Full-copy verification

Refreshed the full independent corpus copy under `~/data/value-logofix/corpus` with symlinks dereferenced (zero symlinks remain), excluding operational runner/lock files, secret env files, logs, backups, the publish hold and archive Git metadata. All logo/publication writes targeted this copy. The original archive stayed at `2d7f1d84db5b28e474a04b8b7f94b29621acbb5f`.

Installed the bundle, ran the **unfiltered fixed logos stage**, then ordinary:

```bash
export TMPDIR="$HOME/data/value-logofix/tmp"
export VALUE_CORPUS_DIR="$HOME/data/value-logofix/corpus"
export VALUE_STORE_DIR="$VALUE_CORPUS_DIR/publish-repo"
export VALUE_NO_EODHD=1
export NODE_OPTIONS=--max-old-space-size=2048
node --conditions=react-server --import tsx scripts/value/cli.ts logos
node --conditions=react-server --import tsx scripts/value/cli.ts \
  publish --out "$HOME/data/value-logofix/publish-out-3"
```

These commands were executed; another replay needs a new empty output directory. There was no `--force`, `--existing-analysis`, `--additions-only`, financial overlay, replacement publisher, push or upload.

- **13,808/13,808 protected non-null records byte-identical after the full stage; all 155 historical states exact** (`preservation.json`).
- **3,910 indexed companies; 3,883 index logos; 27 monograms, 13 US.** Before: 197 missing, 148 US. Published dossier IDs and non-logo country-index fields unchanged; 171 dossier logos repaired/added (151 currently missing indexed historical logos, 19 additions, TLC dossier). All 154 originally requested cache states were restored, including AERO.US, DBV.PA and IWG.LSE, whose restored cache states do not change current dossier logos.
- The unmodified merged coverage guard passes against **both current archive `2d7f1d84` and historical archive `9037c383`**, with no new exceptions. The stricter combined dossier/index/asset measure improves from current **201 to 30** missing and historical **32 to 30** missing; historical US **17 to 15**. The three extra missing beyond the 27 indexed fallbacks are neutral dossiers `278470.KO`, `BRBR.US`, and `TPG.US`, already missing historically.
- `GPGI.US` was present in the historical indexes but is already a neutral dossier in current live data; its original logo remains present. Its missing historical index surface is not a newly lost company/logo. The guard's per-company preservation check passes.
- **20/20 real company pages render with expected logo markup for each baseline** (`coverage-final.log`). No production browser check was invoked; the controller must run the ordinary post-publish check after actual publication.
- `--out` has no Git baseline itself. After generation, the isolated output received only local Git baseline metadata fetched from the read-only source archive; no data commit was made. The real `assertPublishInvariants` then passed against `origin/main = 2d7f1d84`, including the old buy/price/history/view invariants and merged coverage checks (`invariants-final.log`). Historical coverage was checked separately with the same unmodified guard. The controller's real publication gates against the actual remote baseline again before push/upload.

762 non-logo dossier differences

These are reproducible ordinary publication effects on the same copied input corpus, **not evidence of new nightly acquisition since 14:19**. The first and final replays both have 762 affected dossiers and the same field categories. The only changed index field is the logo; membership, prices/buy verdicts and public valuation amounts are unchanged. `drift-classification.json` gives the exact mapping; full before/after values remain in `~/data/value-logofix/evidence-2/non-logo-drift-detail.json`.

| Dossiers | Fields | Classification |
| --- | --- | --- |
| 696 | `historyAssumptions` | Existing `applyPublicationContinuity` re-emits retention provenance using the current baseline dossier's `asOf`. All other assumption text is identical. |
| 70 | `priceStory.asOf` | Story regeneration changes only its timestamp; wording, events, selected evidence, facts and price date are identical. |
| 4 | `valuation.assumptions` | FG.US, IBS.LS, LPP.WAR, WN.TO add the next retained-valuation provenance note. No valuation numbers change. |
| 1 | `series.sbcToOcf`, `tests.accounting.series.sbcToOcf` | TDW.US already has duplicate 2017 rows, one numeric and one null. Existing period-keyed retention fills the null with the already published `0.1099225378089266`; no quality result changes. |

Categories overlap. **Yes: the next ordinary nightly publication on these same inputs would emit these effects anyway** (timestamps use that run's time; genuinely changed future inputs can change the outcome). They are not artifacts introduced by logo installation, and they pass the unchanged current publication guard. No changes were made to suppress or disguise this drift.

Verification

The focused recovery regression tests failed before implementation and pass after it; installer tests exercise hash corruption before any write, exact legacy restoration, deletion of a demoted originally absent cache, newer approval preservation, idempotency and refusal of a changed rejection.

The initial full suite exposed 11 stale runner-fixture failures because the merged guard adds a coverage-summary subprocess; the fixture now stubs that subprocess consistently with its paid/publication subprocess stubs. Dedicated coverage rejection tests are unchanged. The next full run had one five-second runner-test timeout during concurrent archive replay; an isolated full rerun reproduced three multi-cycle timeouts at 5.19–5.39 seconds. The two test definitions that each invoke two real scheduler cycles now have a bounded ten-second deadline. All behavior assertions, test cases and guard rejection checks are unchanged. The final complete suite passes: **255 files, 2,472 tests passed, one pre-existing skip**, exit 0 (`unit-complete.log`). No assertion was removed or test skipped.

Production webpack build passed, including TypeScript and all 222 static pages, using the local copied data store. The clean build-source copy is byte-identical for all changed production files (`build-source-proof.json`). An initial build without the local store lacked the Blob read token; a later scratch-only nested-copy typo caused a typecheck failure and was removed. The final recorded build is `build-verified.log`, exit 0. `git diff --check`, Python syntax checks and controller Bash syntax pass. Committed logs only normalize trailing whitespace; raw outputs remain under `evidence-2`. Disk remained above 4 GiB on both mounts; final verification had approximately 10.8 GiB free on `/` and 75.6 GiB on `~/data`.

Controller release

Run only after the first line of the final shared report says READY. The exact release sequence is `controller-commands.sh`, reproduced below. It pauses the existing idle scheduler without touching its lock, fast-forwards master, waits for the exact release's Vercel production READY deployment, advances the nightly checkout, installs under the paused owner, uses ordinary publication and post-publication checks with the live env file, then resumes. Any failure stops before resume. Never copy the scratch publication over live data or bypass a guard.

The read-only Vercel wait was checked against the existing production deployment and its GitHub status; command semantics also follow the [official inspect documentation](https://vercel.com/docs/cli/inspect). This task did not deploy anything.
```bash
#!/usr/bin/env bash
# Controller only. This task has NOT executed any release command.
set -euo pipefail
repo="$HOME/data/value-logofix"
live="$HOME/value-corpus"
daily=/Users/miki/GitHub/superinvestors-wt/value-daily
report=/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/logofix-2-report.md
paused="$repo/controller-runner-paused-logofix-2.json"
export TMPDIR="$repo/tmp"
export VALUE_CORPUS_DIR="$live"
export VALUE_STORE_DIR="$live/publish-repo"
export VALUE_NO_EODHD=1
export NODE_OPTIONS=--max-old-space-size=2048
cd "$repo"
check_disk() {
  python3 -c 'import pathlib,shutil; assert min(shutil.disk_usage(p).free for p in ["/",pathlib.Path.home()/"data"]) >= 4*1024**3, "DISK STOP: commit and stop"'
}
check_disk
test ! -e "$live/publish.hold"
test "$(head -n 1 "$report")" = READY
release=$(git rev-parse HEAD)
test "$(git log -1 --format=%s)" = 'value: restore demoted logos; publication guard'
git diff --quiet
git diff --cached --quiet
cmp docs/value/logofix-2/bundle-manifest.json "$repo/bundle-2/manifest.json"
sha256sum -c docs/value/logofix-2/bundle.sha256
node --env-file="$live/.env.local" --import tsx scripts/value/install-logo-recovery.ts "$repo/bundle-2" "$live"

# Pause only the idle controller-managed scheduler and its sleep. Lock stays owned.
python3 docs/value/regress-2/harness/controller-runner.py pause "$paused"

# Fast-forward master only. If it advanced, stop for integration and revalidation.
git fetch origin master
git merge-base --is-ancestor origin/master "$release"
git push origin "$release:refs/heads/master"
python3 docs/value/logofix-2/controller-wait-vercel.py "$release"

git -C "$daily" diff --quiet
git -C "$daily" diff --cached --quiet
git merge-base --is-ancestor "$(git -C "$daily" rev-parse HEAD)" "$release"
git -C "$daily" switch --detach "$release"
runner_pid=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["root"]["pid"])' "$paused")
check_disk
VALUE_DAILY_LOCK_PID="$runner_pid" node --env-file="$live/.env.local" \
  --import tsx scripts/value/install-logo-recovery.ts "$repo/bundle-2" "$live" --apply

# Ordinary guarded publication only. No force, overlays or copied snapshot.
check_disk
node --env-file="$live/.env.local" --conditions=react-server --import tsx scripts/value/cli.ts publish
node --env-file="$live/.env.local" --conditions=react-server --import tsx scripts/value/post-publish-cli.ts

# Resume only after both commands succeed. On any failure leave the runner paused.
python3 docs/value/regress-2/harness/controller-runner.py resume "$paused"

```
