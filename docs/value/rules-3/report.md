NOT

# rules-3 — controller rejects every proposed Buy change

Stopped at the sequencing/deadline gate. At 2026-10-06 16:22:40 UTC, `/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/logofix-2.shipped` was absent. The authoritative current date/time is already later than the stated 01:30 UTC cutoff. No next-day extension was assumed. No fetch, merge, fresh-corpus run, external push or publication was performed.

Starting branch: `value-rules`, commit `63a3d4fa5df829f759a9821a213fa8d26212053b`, in the existing isolated worktree `~/data/value-rules`. The rules-2 handoff was read. Its earlier READY status and gate receipts are historical and do not establish rules-3 readiness.

## Controller ruling recorded

`scripts/value/approved-verdict-changes.json` and `docs/value/rules-3/approved-verdict-changes.json` contain exactly `[]`: ZERO approved Buy changes. The existing complete-record publication preservation consumes that manifest; its implementation is unchanged. The three rejected transitions must retain their live records, using the same mechanism as NTB.US and CFG-PH.US:

- IPS.PA: abrupt gross margin change from about 65% to 20% is likely vendor reclassification, not verified deterioration.
- 001800.KO: the cached primary filing belongs to the wrong issuer; the proposed Buy relies on cash covering price.
- 000786.SHE: no matching primary filing.

The pre-existing local `release-bundle/manifest.json` is now NOT, with the superseding controller ruling and missing sequencing gate recorded. Its old archives and proposed approvals remain historical artifacts, not an installable rules-3 release. Do not run the rules-2 proposal generator or its controller instructions: they would reintroduce rejected approvals. No new release bundle has been produced.

All other 3.5.0 rule behavior is left unchanged, including the intended NVDA PPPPP result. Note a counting issue for the fresh audit: rules-2's 185 exposed quality changes include these three rejected records. Complete-record preservation would leave 182 of those previous changes exposed against that same baseline. The post-logofix baseline may differ; measure the new count rather than forcing 185 or weakening preservation.

## Verification and remaining work

Local stop-handoff checks: approval files parse as empty JSON arrays; prior bundle is NOT; `git diff --check` passes. No production readiness is claimed.

All requested release gates remain pending: shipped marker, fetch and merge origin/master, full cached nightly analysis on a fresh independent corpus copy, ordinary `publish --out`, real publish harness with a local bare remote and stub Blob, master coverage guard and logo/valuation comparisons, browser gate on NVDA plus four actually changed companies with zero new findings, full unit suite, and production build. Byte-identical preservation of the three live records has NOT been verified. The request to have everything else ready could not be completed before a cutoff already elapsed when this session began.

No corpus or fixture copy was created. No source corpus file, daily-runner lock, runner state, or live publication was changed. No subagents, EODHD acquisition, or fresh Jev calls were used. Free space at the stop check: `/` 10.817 GiB; `~/data` 76.106 GiB, both above 4 GiB. No disposable copies from this attempt remain; historical rules-2 release evidence is retained.

## Controller commands — BLOCKED, not executed

These describe the required order after a resumed task produces a new READY report and freshly bound rules-3 bundle. The first checks intentionally refuse the current NOT state. Revalidate source/archive bindings and zero Buy changes; do not bypass any guard. The release commit must include the shipped logofix/master changes. Obtain the actual Vercel deployment URL for that exact pushed commit before proceeding; require state Ready and matching commit.

```bash
set -euo pipefail
cd ~/data/value-rules
export TMPDIR="$PWD/tmp"
export npm_config_cache="$TMPDIR/npm-cache"
mkdir -p "$TMPDIR"
report=/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/rules-3-report.md
marker=/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/logofix-2.shipped
bundle="$PWD/release-bundle"
stage="$PWD/controller-corpus"
paused="$PWD/controller-runner-paused.json"
live="$HOME/value-corpus"
daily=/Users/miki/GitHub/superinvestors-wt/value-daily
check_disk() {
  python3 -c 'import pathlib,shutil; assert min(shutil.disk_usage(p).free for p in ["/",pathlib.Path.home()/"data"]) >= 4*1024**3, "DISK STOP"'
}
check_disk
test -f "$marker"
test "$(head -n 1 "$report")" = READY
python3 - "$bundle" <<'PY'
import json,sys
from pathlib import Path
b=Path(sys.argv[1])
assert json.loads((b/'manifest.json').read_text())['status']=='READY'
assert json.loads(Path('scripts/value/approved-verdict-changes.json').read_text())==[]
assert json.loads((b/'proposed-buy-approvals.json').read_text())==[]
PY
release_commit=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["codeCommit"])' "$bundle/manifest.json")
test "$(git rev-parse HEAD)" = "$release_commit"
git diff --exit-code
git diff --cached --exit-code

# Controller alone pauses the existing idle runner, without touching its lock.
python3 docs/value/regress-2/harness/controller-runner.py pause "$paused"
git push origin "$release_commit:refs/heads/master"

# Set VERCEL_DEPLOYMENT_URL to the deployment for release_commit.
# Wait for Ready and verify the deployment's commit matches release_commit.
vercel inspect "${VERCEL_DEPLOYMENT_URL:?Set the exact release deployment URL}" --wait

# Prepare the release runner and stage an independent corpus, excluding secrets,
# runner files and hold files. The live corpus remains read-only in this recipe.
git -C "$daily" diff --exit-code
git -C "$daily" diff --cached --exit-code
git -C "$daily" switch --detach "$release_commit"
npm --prefix "$daily" ci --no-audit --no-fund
check_disk
test ! -e "$stage"
mkdir -p "$stage"
rsync -a --exclude='/daily-runner*' --exclude='/publish.hold*' \
  --exclude='/.env*' --exclude='/backups' --exclude='/logs' "$live/" "$stage/"
check_disk
python3 docs/value/regress-1/harness/stage-bundle.py "$bundle" "$stage"
export VALUE_CORPUS_DIR="$stage"
export VALUE_STORE_DIR="$stage/publish-repo"
export VALUE_NO_EODHD=1
export NODE_OPTIONS=--max-old-space-size=2048
cd "$daily"
node --env-file="$HOME/value-corpus/.env.local" --conditions=react-server --import tsx \
  scripts/value/cli.ts publish
check_disk
node --env-file="$HOME/value-corpus/.env.local" --conditions=react-server --import tsx \
  scripts/value/post-publish-cli.ts
```

The resumed READY handoff must also supply the controller's approved live-overlay/archive installation step before runner resume. This NOT handoff intentionally does not authorize writes to `~/value-corpus`, and it has no verified overlay to install. Do not resume a runner using a stale live archive after publishing from staging. After the controller has installed and verified the release's live state, resume with:

```bash
cd ~/data/value-rules
python3 docs/value/regress-2/harness/controller-runner.py resume "$paused"
```

If any controller step fails, leave the scheduler paused for controller inspection. No controller command was run here. A new cutoff or explicit instruction to resume after the missed cutoff is needed for the remaining release work.
