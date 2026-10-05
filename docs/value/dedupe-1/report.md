READY

Implemented on isolated branch `value-dedupe`, based on cover-6 commit `c0e33ec49fd4c8998ea8d12ff48d30d18b6df768`. Requested commit message: `value: one company, one page across listings`. Controller commands below are recorded only.

55 duplicate issuer groups contain 113 former dossiers. Retiring 58 listing IDs leaves 3,899 company dossiers and 3,892 indexed companies; the seven existing short-history dossiers remain outside the index. All 35 retired baseline IDs and 23 retired coverage-addition IDs have direct aliases and redirects. Every group, supporting identifiers/source links, canonical analysis quality and rejected look-alike is listed in [issuer-decisions.md](issuer-decisions.md). Full machine-readable decisions are in `lib/value/issuer-registry.json`.

Identity review covered all 3,957 published dossiers and 21,750 usable cached General records. Exact ISIN, LEI, normalized CIK, FIGI, depositary-underlying and provider listing edges produced candidates. US/CA NSIN issuer prefixes, websites and names supplied additional review signals, never automatic identity joins. OpenFIGI exact-venue mappings and issuer/depositary sources closed the missing-identifier cases. `audit-coverage.json` records zero missing identity records, zero unresolved candidate signals and no additional FIGI collisions. This is a complete audit of this input snapshot using the recorded evidence, not a claim that provider identifiers can never be wrong. Explicit conflicts fail publication; stale RBC, Navient and Liberty identifiers are corrected from issuer filings. GHC/GHM, SoftBank Corp/Group and APA.US/APA.AU remain separate, as do the other documented rejected pairs and listed subsidiaries.

Canonical selection protects the 147 freezes, then favors full history and primary financial statements, baseline index membership and the primary home listing. The reviewed registry pins these selections to avoid nightly churn. Original canonical dossier objects remain byte-identical, including their numbers and timestamps. Holder unions are published in `issuer-holders.json`, overlaid by the store and API. Multiple listing histories combine USD position values and portfolio percentages per investor; incompatible share quantities and prices are not added. SSPG retains its frozen dossier bytes and now shows Thomas Russo's SSPPF holding; U-Haul combines both share classes.

The ordinary publisher applies aliases after frozen-baseline restoration and before regenerating views. It excludes retired IDs from dossiers, index, current/historical company lists and search. Existing immutable forward observations remain unchanged. Subsequent ordinary nightlies skip retired analysis inputs while retaining aliases and merged holders. Publication invariants reject duplicate registered issuers, missing alias targets, chains, cycles and unaliased dossier losses. `/s/<alias>` and legacy `/value/<id>` resolve in the proxy before streaming/content negotiation and return 308, preserving query parameters. The paid API's data handlers resolve alias dossiers and ownership; no payment or production API request was made.

Verification

- Ordinary local `publish --out` from the dereferenced corpus copy produced `~/data/value-dedupe/staging/release`. No additions-only path, force flag or publication was used. A second ordinary run from a private corpus whose publish-repo already contained the first output produced `~/data/value-dedupe/staging/replay` successfully.
- Direct live comparison: all 3,899 surviving canonical dossiers and all 147 freezes have identical serialized bytes; zero canonical differences. SHA-256 comparison of all 5,137 archive files found zero changed, added or removed files between live and the copied baseline. See `live-proof.json`, `live-archive-proof.json`, `publication-proof.json` and `replay-proof.json`.
- Index and search contain zero duplicate reviewed issuers or alias rows. All 58 retired full listing IDs are searchable as their canonical company. Browser searches for nestle, diageo, alibaba, gsk, carlsberg, u-haul and biglari return exactly one company at both requested viewports (14 checks). Listed subsidiaries remain searchable by their specific names.
- 174 actual HTTP requests cover all 58 removals through `/s/<ticker>`, `/s/<full-id>` and `/value/<full-id>`: all return 308 directly to the canonical company page, preserving `q=2025Q4`. All 58 paid API dossier handlers return their canonical IDs; all 55 holder groups were read through the real store. See `redirect-proof.json`, `browser-search.json`, `api-holder-proof.json`.
- Unmodified production browser gate: 10 merged companies, 1728×970 and 390×844, 250 page/drawer/search states. Zero clipping, overlaps, off-screen content, forbidden wording, page errors or interaction failures. SSPG phone and U-Haul desktop holder drawers were visually inspected. Raw gate exits 1 with 190 whitespace findings and 449 exact-12px shared-control findings. These retain the documented cover-6 owner/controller dispositions; thresholds and raw findings were not altered. `browser-report.json` preserves all findings; `browser-summary.json` separates these dispositions from blocking failures (zero).
- Full unit suite: 228 files passed; 2,247 tests passed and one skipped. Production webpack build and TypeScript checks passed. Final standalone TypeScript check and `git diff --check` passed. Initial failing regression runs and the initial build's dependency-resolution failure remain in local logs; the final runs supersede them.

No subagents, master push, publication, revalidation, daily-runner lock operations, live-corpus writes, usage-ledger writes or paid requests occurred. Work and large artifacts are under `~/data/value-dedupe`; root free space stayed above 4 GiB. The pre-existing untracked cover-6 nightly proof is excluded from this commit. The corpus copy contains no symlinks into the live corpus. The replay corpus links only into that private copy. The owned local preview is stopped after verification.

Controller integration and publish commands — NOT EXECUTED

Integrate the reviewed commit into the controller and nightly checkout through the normal code handoff. This change needs code integration only: do not copy staged dossiers over the live archive or bypass the ordinary publisher. Pause the controller-managed runner gracefully during integration; never delete/reap its lock. The controller should record the exact reviewed commit from `git log -1 value-dedupe` before integration.

```sh
# In the controller's isolated checkout, after its normal code-integration review:
git cherry-pick <reviewed-dedupe-commit>
# Integrate the same commit into the controller-managed value-daily checkout.
```

Run a fresh ordinary local proof under the existing controller lock wrapper, as in cover-6. This command does not publish; ordinary corpus staging/cache bookkeeping still runs under the controller lock. It uses the integrated controller checkout and its existing coverage/source configuration:

```sh
VALUE_CORPUS_DIR="$HOME/value-corpus" VALUE_NO_EODHD=1 \
  NODE_OPTIONS=--max-old-space-size=1536 \
  bash scripts/value/with-daily-lock.sh \
  node --env-file=/Users/miki/GitHub/superinvestors-wt/value-daily/.env.local \
  --conditions=react-server --import tsx scripts/value/cli.ts publish \
  --out "$HOME/data/value-dedupe/controller-proof"

node --import tsx scripts/value/verify-issuer-publication.ts \
  "$HOME/value-corpus/publish-repo" "$HOME/data/value-dedupe/controller-proof" \
  "$HOME/value-corpus/verdict-freeze.json" "$HOME/data/value-dedupe/controller-proof.json"
```

Require zero failures, all 147 freezes unchanged, 58 valid removals for this baseline, no canonical byte changes, and the alias searches and redirects described above. If the live baseline has advanced, review the delta explicitly rather than applying these counts blindly. Choose an unused proof output directory; no overwrite is required.

Only the controller, after its integration proof succeeds and publication is authorized, runs the normal publication and post-publication checks:

```sh
VALUE_CORPUS_DIR="$HOME/value-corpus" VALUE_NO_EODHD=1 \
  NODE_OPTIONS=--max-old-space-size=1536 \
  bash scripts/value/with-daily-lock.sh \
  node --env-file=/Users/miki/GitHub/superinvestors-wt/value-daily/.env.local \
  --conditions=react-server --import tsx scripts/value/cli.ts publish

VALUE_CORPUS_DIR="$HOME/value-corpus" \
  bash scripts/value/with-daily-lock.sh \
  node --env-file=/Users/miki/GitHub/superinvestors-wt/value-daily/.env.local \
  --conditions=react-server --import tsx scripts/value/post-publish-cli.ts
```

Normal publication includes archive/Blob publication and revalidation; do not add manual revalidation. Resume the controller-managed nightly on the integrated reviewed code. Large screenshots, copied inputs, final outputs and full logs remain in `~/data/value-dedupe/`. Local proof commands and artifact hashes are in `verification.json` and `evidence-sha256.json`.
