NOT

Rebased dedupe-1 (`04db69002dc2d31981cc5bddb4a3fe9122c2d297`) onto freshly fetched `origin/master` at `a95f4c71dc9d345c385133258eb38f6b1af53390`, including `22c1a7b`, `eb28a2c`, and `a95f4c7`. Branch: `value-dedupe-ship`. Commit message: `value: one company, one page across listings`.

Blocking result: ordinary publication does not reproduce 24 surviving live dossiers byte-for-byte. The exact invariant remains FAILED. No baseline normalization, dossier replacement, extra freeze, publication override, or gate waiver was used. Do not integrate/publish this as a READY release.

The changed IDs are: TAC.US, GOOS.US, TGS.US, EQX.US, NOG.US, TFII.US, MEOH.US, ITUB.US, HVT.US, NICE.US, AVBH.US, TEO.US, GHM.US, FRFHF.US, PAAS.US, CENTA.US, DSGX.US, BELFB.US, AESI.US, BTG.US, DCOM.US, FSM.US, FWONK.US, HEI-A.US.

The differences include valuations, owner memos, price stories and two price histories; FRFHF.US also changes its buy flag. Full values and paths are in `canonical-differences.json`. An ordinary control publish from the unmodified `value-daily` checkout at the same upstream commit, with a separate private corpus/output, changes 97 dossiers relative to live. Every one of the 24 dedupe differences is also present in that control; all 24 payloads match the control after removing only `priceStory.asOf` for causal comparison. That timestamp normalization is NOT used by the byte-identity proof. See `upstream-control.json`. The rebase introduces no additional changed survivor; the ordinary upstream publisher/live-baseline mismatch still needs resolution before this release can be READY.

Conflict resolution

`proxy.ts` keeps legacy `/value/<id>` and `/s/<alias>` 308 redirects before markdown content negotiation. Markdown negotiation still precedes the HTML `/value?q=` or `?year=` rewrite to `/value/quarter/<quarter>`. Query parameters survive redirects and rewrites. `lib/agent-api/data.ts` retains both the history-copy imports and dedupe's identity/holder imports. Upstream nightly price-story/history code and the quarter route are unchanged. Three additional proxy regression cases cover Accept negotiation precedence.

Fresh corpus and publication proofs

- Copied the current live corpus with `rsync -aL`, excluding environment files and lock directories, into `~/data/value-dedupe-2/corpus`. Copy exit 0, zero symlinks. No live corpus write or runner-lock operation was performed. Dereferenced size is about 54 GiB, on the data volume.
- The 07:11 UTC nightly baseline contains 3,957 dossiers, as requested. Compared with dedupe-1, membership is unchanged but 141 dossiers differ. All 5,145 live archive files match the fresh copied baseline and remain unchanged at final comparison (`live-archive-proof.json`).
- Fresh identity audit: 3,957 dossiers and 21,856 cached vendor records. Reused the reviewed issuer/depositary/OpenFIGI gap evidence from dedupe-1; no new external identity lookup was made. Zero missing identities, unresolved candidate signals or new FIGI collisions (`audit-coverage.json`, `identity-gap-sources.json`).
- Ordinary `publish --out` succeeded, without force, additions-only or existing-analysis flags: 3,899 surviving dossiers, 3,892 indexed companies, 55 merged issuer groups and 58 removed IDs. The seven short-history dossiers remain outside the index. All 147 freezes are unchanged. Index/search have zero duplicate reviewed issuers or alias rows, and all 58 alias searches reach their canonical company. The only publication-proof failure is the 24 changed surviving dossiers above.
- A second ordinary publish from a private corpus whose baseline is the first deduplicated output succeeds: all 3,899 dossiers byte-identical to the first output, all 147 freezes unchanged, no additional removals and zero proof failures (`replay-proof.json`). This demonstrates replay stability, not live-baseline equality.
- All four existing immutable forward files remain byte-identical (`forward-proof.json`).

Functional and production proofs

- 696 actual HTTP requests cover every removed ID as `/s/<ticker>`, `/s/<full-id>` and `/value/<full-id>`, with and without `?q=2025Q4`, under HTML and markdown Accept headers. All return direct 308 canonical redirects with query preservation (`redirect-proof.json`).
- The seven browser searches—nestle, diageo, alibaba, gsk, carlsberg, u-haul and biglari—each return exactly one company at 1728×970 and 390×844: 14/14 passed (`browser-search.json`).
- Paid API data handlers: 232 dossier/verdict/memo/price-story alias resolutions and 104 ownership resolutions passed. Holder unions checked across all 55 groups, 1,494 quarters and 2,451 source positions; USD values and portfolio percentages agree with source sums. SSPG includes Thomas Russo, U-Haul combines its classes, and both benchmark history-copy strings remain present (`api-holder-proof.json`). These call the real data handlers locally; no payment or live paid request was made.
- Unmodified production release gate on NSRGY, DGE.LSE, BABA, GSK.LSE, CARL-B.CO, UHAL-B, BH, SSPG.LSE, AMCR and RI.PA at both requested viewports: 250 states, zero blocking clipping/overlap/off-screen/wording/page-error/interaction findings. Raw exit 1, 210 failed states, 190 whitespace findings and 449 exact-12px shared-control findings. The prior cover-6 controller/owner dispositions are retained exactly; no thresholds were changed. Raw findings are in `browser-report.json`, dispositions in `browser-summary.json`. SSPG phone and U-Haul desktop holder drawers were visually inspected.
- `scripts/value/live-check.ts:checkTimeTravel` passed against the local production build at both viewports: Today → latest quarter via the slider, direct 2018Q3, correct headline/row count and no page errors. Actual HTTP rewrite headers prove `/value?q=2018Q3` → `/value/quarter/2018Q3?q=2018Q3` and `?year=2018` → `/value/quarter/2018Q4?year=2018`; rendered frames are correct (`live-check.json`).
- Full unit suite: 229 files passed, 2,265 tests passed, one skipped, zero failures. Production webpack build, standalone TypeScript and diff checks passed. The first unit run had one newly written test expecting the public markdown suffix rather than the existing internal `/md/value` target; the assertion was corrected and the entire suite rerun successfully. No product change was made for that test correction.

All local proof outputs, logs and screenshots are retained under `~/data/value-dedupe-2/`. Executed proof commands and hashes are in `verification.json` and `evidence-sha256.json`; reusable harnesses are under `harness/`. The pre-existing untracked cover-6 nightly proof is excluded. No subagents, push, publication, revalidation, daily-runner lock operations, paid requests, usage-ledger writes or live-corpus writes occurred. Root and data-volume free space stayed above 4 GiB. The owned preview is stopped after verification.

Controller commands — recorded only, NOT EXECUTED

This report is NOT. Do not execute the handoff/publication commands until the canonical-byte blocker is resolved, a fresh full proof is successful, and the reviewed successor report says READY. Do not copy the staged output over the archive. Pause the controller-managed runner gracefully for the eventual integration; never delete/reap its lock. Record the reviewed commit with `git rev-parse value-dedupe-ship` and integrate that exact reviewed commit into the controller and nightly checkout through the normal handoff.

```sh
# In the controller's isolated checkout, only after a READY successor:
git cherry-pick "$(git rev-parse value-dedupe-ship)"
# Integrate that same reviewed commit into the controller-managed value-daily checkout.

# Fresh ordinary proof under the existing cover-6 lock-wrapper flow.
# Select an unused output directory; the wrapper is for the controller only.
VALUE_CORPUS_DIR="$HOME/value-corpus" VALUE_NO_EODHD=1 \
  VALUE_MIN_FREE_GB=4 NODE_OPTIONS=--max-old-space-size=1536 \
  bash scripts/value/with-daily-lock.sh \
  node --env-file=/Users/miki/GitHub/superinvestors-wt/value-daily/.env.local \
  --conditions=react-server --import tsx scripts/value/cli.ts publish \
  --out "$HOME/data/value-dedupe-2/controller-proof"

node --import tsx scripts/value/verify-issuer-publication.ts \
  "$HOME/value-corpus/publish-repo" "$HOME/data/value-dedupe-2/controller-proof" \
  "$HOME/value-corpus/verdict-freeze.json" "$HOME/data/value-dedupe-2/controller-proof.json"
```

Require zero proof failures, 147 unchanged freezes, zero canonical byte changes and all alias/search/API/browser/time-travel proofs. This baseline expects 58 valid removals and 3,899 survivors; explicitly review any later baseline delta. The current output fails the canonical-byte requirement and is not an approved substitute.

Only after READY, controller integration proof, and publication authorization:

```sh
VALUE_CORPUS_DIR="$HOME/value-corpus" VALUE_NO_EODHD=1 \
  VALUE_MIN_FREE_GB=4 NODE_OPTIONS=--max-old-space-size=1536 \
  bash scripts/value/with-daily-lock.sh \
  node --env-file=/Users/miki/GitHub/superinvestors-wt/value-daily/.env.local \
  --conditions=react-server --import tsx scripts/value/cli.ts publish

VALUE_CORPUS_DIR="$HOME/value-corpus" \
  bash scripts/value/with-daily-lock.sh \
  node --env-file=/Users/miki/GitHub/superinvestors-wt/value-daily/.env.local \
  --conditions=react-server --import tsx scripts/value/post-publish-cli.ts
```

Normal publication owns archive/Blob publication and revalidation. Do not add manual revalidation. Resume the runner only on the integrated reviewed code. None of these controller commands was executed here.

Report written 2026-10-05T07:40:46.673203+00:00.
