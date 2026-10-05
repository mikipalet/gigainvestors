READY

Code fix ready for integration; committed only in the isolated `value-nightlyfix2` worktree. The running runner has not been updated. No push or publication was performed, and neither the `value-daily` checkout nor its `daily-runner.lock` was touched. No paid API requests were made by the corpus replay.

The successful dry-run proof is a bounded, real-cache analysis replay. **A complete cache-only re-analysis of the entire corpus is not claimed:** an additional full-universe probe encountered uncached Jev evidence and was stopped. Details below distinguish these outcomes.

The October 5 logs confirm 33,049 selected / 9,564 attempted / 9,484 written / 23,485 deferred fundamentals, yields exit 75, analysis skipped by the runner's conditional, thesis exit 75 at 240 calls, and status failing to resolve `server-only`. `~/value-daily.log` had already been replaced with the next-run waiting message when inspected; the dated stage logs retain the incident evidence.

Both nightly fundamentals passes now use `--nightly`. `nightlyBudget` calculates `reserved = max(40,000, quote attempts + yield attempts + FX allowance + history allowance)` and `ceiling = max(0, 100,000 - reserved)`. For the actual 38,086-company universe:

| Reservation | Calls |
| --- | ---: |
| Bulk quotes: 65 exchanges × 100 × 4 attempts | 26,000 |
| Yields: 57 countries × 4 attempts | 228 |
| FX allowance | 500 |
| Price-history allowance | 15,000 |
| Total protected | **41,728** |
| Fundamentals shared-ledger ceiling | **58,272** |

The existing ledger remains authoritative. A scoped ceiling applies to every HTTP attempt made during fundamentals, including enrichment/normalization FX and retries; an existing stricter hard cap still wins. Provider usage is synchronized before enrichment. Both fundamentals passes conservatively retain the whole reserve, even if some reserved work already ran. At the ceiling, paid companies are deferred without treating them as failed downloads; free India work can still proceed. The separate coverage workflow's existing 60,000-call ceiling is unchanged. Already-consumed account quota cannot be recovered.

Yields failures and unconfirmed resets now lead to analysis with `VALUE_NO_EODHD=1`, rather than skipping analysis. Optional price-story/news runs after yields and analysis. An analysis failure still retains the released analysis; thesis budget exhaustion alone no longer discards a successful fresh analysis. Disk and publication-verification stops remain in place.

Status imports a Node-compatible published reader directly. Web consumers retain the `server-only` wrapper. Regression tests launch the actual CLI both as `node --import tsx scripts/value/cli.ts status` (the runner's current command) and with `--conditions=react-server`; both succeed and return the fixture's published metadata.

Validation: **185 tests passed across 16 files**, scoped TypeScript check passed, `bash -n` passed, and `git diff --check` passed. Regression failures were reproduced before the fixes: the missing module, skipped analysis, and missing budget ceiling. Coverage includes both fundamentals passes, per-request FX enforcement, stricter hard caps, release of the stage ceiling, reset/yields failure paths, and a real CLI ledger-boundary test with a simulated HTTP transport.

The independent corpus copy is `/Users/miki/data/nightly-test2` (710,191 files; no hardlinks; credentials, Git internals and runner locks excluded). Its `nightlyfix-proof/` directory retains replay scripts, transport, full logs, commands, results, and the original copied ledger. Only that copy's ledger was changed. The transport blocks external fetches and substitutes cached EODHD payloads for the boundary test; Jev credentials are explicitly empty.

| Corpus-copy replay | Result |
| --- | --- |
| Fundamentals, ledger 58,262, actual-universe ceiling 58,272 | Exit 0; AAPL refreshed from cached provider payload, next company deferred; ledger exactly 58,272 |
| Fundamentals, ledger 99,995 | Exit 0; 0 attempted, 0 written, 2 deferred |
| Yields, `VALUE_NO_EODHD=1` | Exit 0; all 57 countries processed from cached observations; ledger unchanged |
| Cached analysis: AAPL, MSFT, META, BRK-B, KO, PEP, TPL, TSCO | Exit 0; **8 written, 0 unchanged, 0 failed**; all eight timestamps advanced from October 4 to October 5; ledger unchanged |
| Status with `--conditions=react-server` | Exit 0; universe 38,086, analysed files 38,077, published count 3,950; ledger unchanged |

For the eight-company replay, only their analysis results, input caches, and fingerprints in the copy were restored from the source baseline first, proving fresh writes rather than an unchanged-cache no-op. Fundamentals and report inputs were real copied data, and Jev answers were existing caches, not invented responses. The network log contains exactly two simulated requests (`/user` and `/fundamentals/AAPL.US`) and no external requests.

The additional unbounded offline probe ran for 618 seconds, encountered **304 missing Jev-cache failures**, and was terminated by this task (exit -15). After the probe and bounded replay, 5,248 fresh analysis files were observed. The 304 errors were all `JEV_API_KEY is required`; no new answers were substituted. Completing every company requires the normal Jev service for uncached evidence. This is a dry-run limitation, not evidence of a full-universe successful nightly. The normal runner retains its configured Jev access.

Thesis budget assessment: the stop is correct for its configured **240 logical Jev calls per invocation**, but this budget does **not guarantee 12 completed companies**. October 5 completed 10/12, with 185 calls represented in completed recordings; 55 successful calls were outside those completed recordings when the next call was refused. SANB3 alone used 78; other completed companies ranged from 0 to 29. Usage was 1,277,719 input tokens. The cap counts logical calls, not transport retry attempts, and is not a persistent daily token ledger. No automatic budget increase was made: 12 is a selection maximum, while 240 is a cost bound. If 12 completions are required, that needs a separate spending policy or resumable partial-company recordings. The existing regression confirms no partial thesis is saved at exhaustion.

Disk stayed above the requested 4 GiB stop floor. Final observed free space was approximately 8.1 GiB on the worktree filesystem and 14.3 GiB on the copy volume. No production build was run.

Small evidence files are committed under `docs/value/nightlyfix-2/`. Full replay artifacts and verification logs remain under `/Users/miki/data/nightly-test2/nightlyfix-proof/`.
