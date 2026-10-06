READY

rules-3 — 3.5.0 with zero approved Buy changes

All requested local release gates pass. The controller has approved zero Buy changes. This report authorizes no external action by the agent; deployment and publication remain controller steps below.

The logofix-2 shipped marker was observed on 2026-10-06 at 17:20:23Z, before the 2026-10-07T01:30Z deadline. Only then was origin/master `5e21e2e85abfffb300c7fad02f825aee062bf550` fetched and merged as `05ca5abdd14f8dd899c198b6fa492c795dc73933`. Verification used a fresh, independent copy of the live corpus, with all 361 source symlinks dereferenced. The bound live archive was `6d6cb59f9dbf63d7ea4b91ad3951053657eb6dd1`.

The controller approved **NONE** of the proposed Buy changes. Both approval manifests contain exactly `[]`; the publication has **zero Buy changes**. IPS.PA (likely vendor gross-margin reclassification), 001800.KO (wrong-issuer filing; cash-only case), and 000786.SHE (no primary filing) retain their complete live records through the existing publication-continuity mechanism. NTB.US and CFG-PH.US remain preserved by that same mechanism.

| Preserved ID | Exact serialized records checked | Result |
|---|---:|---|
| IPS.PA | 80 | Byte-identical to live |
| 001800.KO | 11 | Byte-identical to live |
| 000786.SHE | 118 | Byte-identical to live |
| NTB.US | 12 | Byte-identical to live |
| CFG-PH.US | 21 | Byte-identical to live |

The checks cover each available dossier, index, history, search and price record in the ordinary export and real publication. All 151 explicit frozen dossiers also remain unchanged.

The earlier **185** quality-mask changes included the three rejected records. Complete-record preservation leaves **182 exposed quality changes**; the other three stay entirely live. There are no unrelated quality changes. NVDA changes FFPPP → **PPPPP**. The other browser targets are EME FPPPP → PPPPP, RSG PFPPP → PPPPP, ROK PFPFP → PPPFP, and TMO PFPPP → PPPPP.

| Gate | Result |
|---|---|
| Full cached nightly analysis | 38,281 jobs; 38,193 written; 20,597 validated cached readings; zero unexpected failures |
| Expected cache misses | 88 enumerated misses; exact prior analysis/input/fingerprint bytes retained; excluded from installation overlay |
| Ordinary `publish --out` | Pass; 3,915 dossiers / 3,910 indexed companies |
| REAL publication harness | Pass using a local bare remote and stub Blob; production calibration, invariant, coverage and page guards executed |
| Local post-publish | Pass; production check, coverage guard and rendered-page verification |
| Browser | NVDA + EME/RSG/ROK/TMO; 128 states per arm, desktop 1728×970 and mobile 390×844; zero new visual or semantic findings |
| Surface checks | 20 quality and 10 price audits; drawer arithmetic checked |
| Full unit suite | 257 test files; 2,489 passed, 1 existing skip; no failures |
| Production build | Pass, 222 prerendered pages; TypeScript passes |

The browser gate retains its strict raw results: 108 states have the previously accepted small-text/whitespace findings. Four NVDA test-versus-dossier share-series findings and ten hidden valuation-table findings match live exactly. All 14 legacy semantic findings are recorded separately; none is new. A harness comment edit interrupted the first baseline semantic run; the complete baseline arm was rerun successfully without changing the comparison policy.

Master's production coverage guard is unchanged and passes in both export and real-publication checks. Dossiers remain 3,915, logo coverage 3,885, missing logos 30, quality coverage 3,670 and price-history coverage 3,910. Valuation coverage increases 2,425 → 2,435. Buy counts remain 27 overall, 14 US and 21 western. No country membership is lost; default-index membership increases 1,019 → 1,022.

The real publication retains all **3,737 baseline logo files byte-for-byte**. The empty-directory ordinary export contains 3,712 identical files and omits 25 assets proven unreferenced anywhere in the baseline JSON. No published dossier/index logo reference changes. Both arms pass 20/20 rendered-page/logo checks.

There are no removed numeric values, new numeric nulls, valuation losses, or price/history/forward changes apart from identity ordering. Fifty-one rows have valuation-tuple and/or margin differences from live that were already present in reviewed rules-2. Every valuation tuple and margin for all 3,910 indexed companies matches that reviewed candidate exactly in both publication arms. The historical candidate is bound to `63a3d4fa5df829f759a9821a213fa8d26212053b` and SHA-256 `a6f678f9932326e0017bb3c0f70b6fbf2596bfd6fe4776afb8690dcb35337988`. No separate 3.4 control analysis was run for rules-3.

The reviewed method files and thresholds are unchanged. Emptying the approval JSON exposed TypeScript's `never[]` inference; an explicit type on its predicate fixes the build. Transpiled JavaScript before/after that annotation is byte-identical (SHA-256 `7e3c1cb13c07a04294d78c43b56833692f289817cf22cae61f6560b3577bcef6`). The final-source full unit suite, build and TypeScript check were rerun after that type-only fix.

The real local publication contains **6,269 files / 211,782,802 bytes**, with Blob version `8ff93dfc7595c3453a3b3f97a8643589ccb7d0152a2d8cd72b0b055550646901`. Its final commit, hashes and archive/source bindings are recorded in the verification receipts and release bundle.

No external code push, external data publication, runner signal, runner-lock access, live-corpus modification, subagent, EODHD acquisition or fresh Jev call was performed. Runtime gates used a network namespace with loopback only and a read-only live-corpus mount; all fixtures and TMPDIR were under `~/data/value-rules`.

Final integrity rehashed all **782,884 source files and 6,269 archive files** with zero mismatches; the live archive commit is unchanged. Ordinary-export and real-publication contents agree across 2,175 index/dossier/search files, apart from run-clock price-story timestamps. Local archive commit `278cf86d6c146c00c9a201dfc0931674a673902e` equals the local bare remote; the pending-publication receipt is cleared and the archive is clean. Stub Blob bytes match the committed snapshot and its version hash exactly.

The release bundle at `~/data/value-rules/release-bundle` contains an **80,487-file overlay**, the candidate archive, full evidence, source/archive bindings and empty approval manifest. All six artifact hashes and every overlay member were validated. The secret scan covered 81,406 files and 11 known secret values with **zero findings**. The final `manifest.json` binds READY to the exact final `value-rules` commit (`codeCommit`); its subject is `value: 3.5.0 without unproven buy changes`.

Cleanup is complete: the fresh corpus, baseline/candidate stores, local bare remote, stub Blob, temporary caches and build output were deleted. The existing dependency symlink target was left intact. Minimum free space was 10.80 GiB on `/` and 17.85 GiB on `~/data`; after cleanup it was 11.86 GiB and 75.56 GiB respectively. The 4 GiB stop condition never occurred.

Committed review receipts are in `docs/value/rules-3/evidence/`, with cleanup in `docs/value/rules-3/cleanup.json`. The full browser screenshots, strict results, cache-failure retention proofs and execution logs are in `release-bundle/evidence.tar.gz`. Any controller-time source/archive drift requires a fresh proof; the installer checks these bindings before release.

# Controller only — do not execute unless rules-3 is READY

The agent has not pushed code, published data, paused the runner, or changed the live corpus. These commands are the controller's release procedure. Any failure leaves the runner paused for inspection. No command opens or modifies the runner lock.

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
backup="$PWD/controller-backup"
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
import hashlib,json,sys
from pathlib import Path
b=Path(sys.argv[1]);m=json.loads((b/'manifest.json').read_text())
assert m['status']=='READY' and m['method']=='3.5.0'
assert json.loads(Path('scripts/value/approved-verdict-changes.json').read_text())==[]
assert json.loads((b/'proposed-buy-approvals.json').read_text())==[]
assert hashlib.sha256((b/'proposed-buy-approvals.json').read_bytes()).hexdigest()==m['approvalManifestSha256']
PY
release_commit=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["codeCommit"])' "$bundle/manifest.json")
test "$(git rev-parse HEAD)" = "$release_commit"
git diff --exit-code
git diff --cached --exit-code

# Pause the existing idle scheduler, then push code without force.
python3 docs/value/regress-2/harness/controller-runner.py pause "$paused"
git push origin "$release_commit:refs/heads/master"

# Bind GitHub's Vercel status to this exact release SHA and require production Ready.
python3 docs/value/logofix-2/controller-wait-vercel.py "$release_commit"

git -C "$daily" diff --exit-code
git -C "$daily" diff --cached --exit-code
git -C "$daily" switch --detach "$release_commit"
npm --prefix "$daily" ci --no-audit --no-fund

# Install the verified overlay into independent staging first. The installer
# verifies every artifact, live archive binding, and analyzed source hash.
check_disk
test ! -e "$stage"
mkdir -p "$stage"
rsync -aL --exclude='/daily-runner*' --exclude='/publish.hold*' \
  --exclude='/.env*' --exclude='/backups' --exclude='/logs' "$live/" "$stage/"
python3 docs/value/regress-1/harness/stage-bundle.py "$bundle" "$stage"
export VALUE_CORPUS_DIR="$stage"
export VALUE_STORE_DIR="$stage/publish-repo"
export VALUE_NO_EODHD=1
export NODE_OPTIONS=--max-old-space-size=2048
cd "$daily"
check_disk
node --env-file="$HOME/value-corpus/.env.local" --conditions=react-server --import tsx \
  scripts/value/cli.ts publish
check_disk
node --env-file="$HOME/value-corpus/.env.local" --conditions=react-server --import tsx \
  scripts/value/post-publish-cli.ts

# After both publication checks pass, back up only affected corpus paths and
# the archive. Install the same overlay and verified published archive for the
# resumed daily runner. Do not copy or manipulate any daily-runner file.
check_disk
test ! -e "$backup"
mkdir -p "$backup"
python3 - "$bundle" "$live" "$backup" <<'PY'
import json,shutil,sys
from pathlib import Path
bundle,live,backup=map(Path,sys.argv[1:])
for rel in json.loads((bundle/'manifest.json').read_text())['overlayFiles']:
    src=live/rel
    if src.is_file():
        dst=backup/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
shutil.copytree(live/'publish-repo',backup/'publish-repo')
PY
tar --no-same-owner -xzf "$bundle/corpus-overlay.tar.gz" -C "$live"
rsync -a --delete "$stage/publish-repo/" "$live/publish-repo/"
test "$(git -C "$live/publish-repo" rev-parse HEAD)" = \
     "$(git -C "$stage/publish-repo" rev-parse HEAD)"
test ! -e "$live/publish-repo/.git/value-publish-pending.json"

# The controller may clear the publication hold after successful publication.
rm -f "$live/publish.hold"
cd ~/data/value-rules
python3 docs/value/regress-2/harness/controller-runner.py resume "$paused"
python3 - "$stage" <<'PY'
import shutil,sys
from pathlib import Path
p=Path(sys.argv[1]);assert p==Path('/Users/miki/data/value-rules/controller-corpus')
shutil.rmtree(p)
PY
```

Retain the rollback backup and release bundle. If source/archive bindings, deployment identity, any guard, or post-publish checks fail, stop and leave the scheduler paused; do not weaken a guard or resume against stale live state.
