NOT

The nightly preservation fix is implemented, but the requested recovery cannot be obtained by reinstalling the logos-1 bundle. Do not execute the controller release sequence until the recovery blockers below are resolved.

## Diagnosis

Live data archive: `2d7f1d84`. Its country indexes contain 3,910 companies, 197 missing logos, including 148 US listings.

The 2026-10-06 pre-run snapshot `enrichment-v7/logos/runs/1791275081726-before.json` records 154 previously published logos subsequently replaced by null caches. Of these, 142 had legacy caches without `validationVersion` or `identityReview`; 12 had no logo cache. The stage required validation version 2, or could bypass its cache checks under `--only --force`, and wrote an unreviewed replacement as `logo:null`. That validated null shadows the prior company logo during enrichment.

NTES.US previously used `https://eodhd.com/img/logos/US/Ntes.png` in a legacy `validated:true` record. AAL.US had a published logo and no cache. Neither ID is in the logos-1 bundle. None of the 154 demoted IDs overlaps the bundle.

All 1,137 approved bundle records were already byte-identical to the bundle in the live corpus before this task. The bundle contains 1,165 entries: 1,137 approvals and 28 documented fallbacks. It was designed to fill then-missing logos, not back up all existing logos. Therefore reinstalling it cannot repair the demoted legacy logos.

Among the current 197 missing logos, 151 were present in the logos-1 baseline, 27 are surviving documented bundle fallbacks, and 19 are later additions. The membership differs from logos-1: 19 additions and 59 removals. Even restoring those 151 baseline logos alone would leave 46 missing (32 US), including 19 later additions. The pre-nightly snapshot already has 32 missing US logos when restricted to today's published IDs, so the requested 13-US target also needs work beyond reversing this nightly overwrite.

## Change

`scripts/value/stages/logos.ts` preserves non-null validated approvals independently of validator/matcher version and forced retries, including legacy validated records predating identity review. It also preserves published logos when no logo cache exists. It rechecks approval immediately before committing a discovery result, so a concurrently installed approval remains byte-identical even when its timestamp equals the prior record's. The nightly stage fills missing records; reviewed replacement remains an explicit installer/controller operation.

`tests/unit/value/logo-preservation.test.ts` exercises the real stage against temporary corpora and deterministic external responses. It covers old matcher/version approvals, current approvals, forced retries, legacy validation, uncached published logos, and approval during discovery. The initial five regression cases all failed on the original implementation and passed after the fix. Existing new-company acquisition still passes.

## Evidence

All scratch files, temporary fixtures and output live under `~/data/value-logofix`; `TMPDIR` is its `tmp` directory. The live corpus was read-only. No subagents, push, real publication, runner signalling, or daily-runner lock operations occurred. Copy exclusions included `/daily-runner*`, secret env files, live holds, logs, backups, the publish lock and Git metadata. Logo, publication and staging writes target independent copied files. The source already contained 361 report/raw/flag symlinks; those were retained as read-only inputs (listed in `copy-symlinks.json`), never used as write targets.

Retained evidence under `~/data/value-logofix/evidence`:

- `regression-red.log`, `regression-green.log`: failing-before/passing-after stage regressions.
- `nightly-demotions.json`: pre/post records for all 154 affected pre-run logos.
- `live-bundle-before.json`, `copy-bundle-before.json`, `copy-bundle-after-install.json`, `copy-bundle-after-stage.json`: per-ID SHA-256 and approval evidence.
- `install-dry-run.log`, `install-apply.log`: installer preflight and actual `--apply` on the copy. Apply installed 10 changed fallback records and preserved 1,155 records; all 1,137 approved records remained identical.
- `logos.log`: unfiltered fixed nightly stage, 4,107 targets, 4,094 cached, 13 checked, 10 recovered candidates and 3 unavailable. Candidates still require identity approval. All 1,137 bundle approvals stayed byte-identical after the stage.
- `all-preserved-records.json`: all 13,646 live non-null validated/approved-or-legacy cache records compared byte-identical with the repaired/staged copy, including records outside nightly scope.

The installer CLI's existing apply guard only checks `VALUE_DAILY_LOCK_PID`. For the isolated copy, the shell's own PID was supplied to that guard; no lock was acquired or accessed. The controller sequence below instead obtains the paused scheduler's PID from its pause receipt.

## Ordinary publication result: recovery blocked

The real ordinary `publish --out` completed with exit 0 and passed its publication invariants (`evidence/publish-out.log`). It emitted **3,910 companies, 197 missing logos / 148 missing US logos**: exactly the live missing-logo counts, with zero dossier logo changes. Thus bundle reinstall plus fixed stage does **not** restore the requested logos-1 coverage.

`evidence/live-vs-publish.json` compares every dossier with live archive `2d7f1d84`, allowing only `company.logo` to differ. IDs are unchanged; non-logo country-index changes are zero. However, **762 dossiers differ outside logos**: 696 have `historyAssumptions` changes, 70 `priceStory`, four `valuation`, one `series`, and one `tests` (categories overlap). `non-logo-drift-samples.json` retains examples: the historical preservation note advances its source timestamp from the previous publication to the current one. Valuation differences affect FG.US, IBS.LS, LPP.WAR and WN.TO; TDW.US has series/tests differences. The complete ID list is in `live-vs-publish.json`. This ordinary-replay drift is another unmet release condition; no financial or publication logic was changed to hide it.

`copy-baseline-vs-live.json` confirms that all 631 copied baseline dossier and index files are byte-identical to the live source. The live Git archive stayed at `2d7f1d84` throughout. Local output is retained at `~/data/value-logofix/publish-out` for review, not for installation.

## Unit suite and build

The final full unit suite passed: **251 files, 2,435 passed tests, one skipped**, unchanged test timeouts (`evidence/unit-final.log`, exit 0). The first full run had one unrelated five-second runner integration timeout under concurrent copy/build load; it passed in the complete rerun. No test was weakened or skipped to obtain the pass.

Production build passed, including TypeScript and all 222 static pages (`evidence/build-final.log`, exit 0). Command: `npm run build -- --webpack`, with `TMPDIR=~/data/value-logofix/tmp`, `NODE_OPTIONS=--max-old-space-size=2048`, and telemetry disabled. The first build worker received SIGTERM. The successful retry used `~/data/value-logofix/build-source`, a clean copy of 3,248 source files (the current tracked files plus the new regression test), with shared existing dependencies. The changed production source and test were verified byte-identical to the working tree. The retry reported only a workspace-root inference warning. `git diff --check` passes.

## Reproduction

From the isolated `~/data/value-logofix` worktree, with the independent corpus copy already prepared:

```bash
export TMPDIR="$HOME/data/value-logofix/tmp"
export VALUE_CORPUS_DIR="$HOME/data/value-logofix/corpus"
export VALUE_STORE_DIR="$VALUE_CORPUS_DIR/publish-repo"
export VALUE_NO_EODHD=1
export NODE_OPTIONS=--max-old-space-size=2048
node --import tsx scripts/value/install-logos.ts \
  "$HOME/data/value-logos/bundle" "$VALUE_CORPUS_DIR"
VALUE_DAILY_LOCK_PID=$$ node --import tsx scripts/value/install-logos.ts \
  "$HOME/data/value-logos/bundle" "$VALUE_CORPUS_DIR" --apply
node --conditions=react-server --import tsx scripts/value/cli.ts logos
node --conditions=react-server --import tsx scripts/value/cli.ts \
  publish --out "$HOME/data/value-logofix/publish-out"
python3 docs/value/logofix-1/verify-copy.py compare \
  "$VALUE_CORPUS_DIR/publish-repo" "$HOME/data/value-logos/bundle" \
  "$HOME/data/value-logofix/publish-out"
```

Use a new empty output directory for another replay. This is ordinary local `publish --out`, without `--force`, `--existing-analysis`, `--additions-only`, financial overlays, or a replacement publication script.

## Controller commands — recorded only, blocked while this report says NOT

Reinstall alone is insufficient. Before release, prepare and verify a scoped recovery of the lost baseline logos, resolve/document later missing additions against the requested target, and require an ordinary local replay with no non-logo dossier differences. Do not copy the full scratch corpus or generated snapshot over live data. The following requested sequence is intentionally guarded by READY; it is not authorization to ignore the blockers.

```bash
set -euo pipefail
repo="$HOME/data/value-logofix"
live="$HOME/value-corpus"
daily=/Users/miki/GitHub/superinvestors-wt/value-daily
report=/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/logofix-1-report.md
paused="$repo/controller-runner-paused.json"
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
test "$(head -n 1 "$report")" = READY
release=$(git rev-parse HEAD)
test "$(git log -1 --format=%s)" = 'value: nightly logos never demote approved logos'
git diff --quiet
git diff --cached --quiet
cmp docs/value/logos-1/bundle-manifest.json "$HOME/data/value-logos/bundle/manifest.json"

# Pause only the idle scheduler and its sleep; never access its daily-runner lock.
python3 docs/value/regress-2/harness/controller-runner.py pause "$paused"

# Push reviewed code and advance the nightly checkout without dropping newer code.
git push origin "$release:refs/heads/value-logofix"
git -C "$daily" diff --quiet
git -C "$daily" diff --cached --quiet
git merge-base --is-ancestor "$(git -C "$daily" rev-parse HEAD)" "$release"
git -C "$daily" switch --detach "$release"

# The paused scheduler still owns its lock. Use its receipt, not the lock wrapper.
# with-daily-lock.sh must NOT be used here: the paused owner keeps that lock.
runner_pid=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["root"]["pid"])' "$paused")
check_disk
node --env-file="$live/.env.local" --import tsx scripts/value/install-logos.ts \
  "$HOME/data/value-logos/bundle" "$live"
VALUE_DAILY_LOCK_PID="$runner_pid" node --env-file="$live/.env.local" \
  --import tsx scripts/value/install-logos.ts \
  "$HOME/data/value-logos/bundle" "$live" --apply

# Only after the separately verified legacy-logo recovery has also been applied.
check_disk
node --env-file="$live/.env.local" --conditions=react-server --import tsx \
  scripts/value/cli.ts publish
node --env-file="$live/.env.local" --conditions=react-server --import tsx \
  scripts/value/post-publish-cli.ts

# Resume only after ordinary publication and post-publish verification succeed.
python3 docs/value/regress-2/harness/controller-runner.py resume "$paused"
```

If any command fails, stop the sequence. Keep the runner paused and inspect the failure; do not manipulate its lock or resume after an unverified publication. No command in this controller block was executed by this task.
