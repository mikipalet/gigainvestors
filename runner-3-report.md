# Runner 3 ops report

STATUS: COMPLETE — ready for controller merge and runner restart.

Worktree: `/Users/miki/GitHub/superinvestors-wt/value-o-ops`
Branch: `value-o-ops`, created from `value` at `53299a0`.
Commit message: `value: runner waits for EODHD reset; more Yahoo venues`.

## Reset gate

The 2026-09-30 00:05 UTC run imported EODHD's previous-day usage into the new
UTC-day ledger. Ordinary synchronization takes the higher local/provider count,
so that stale count persisted even after the provider reset. The incident's
08:31 UTC observation was `apiRequests=25`, `apiRequestsDate=2026-09-30`.

- Default runner start moves to 03:00 UTC.
- After Japan ingestion and before prices/history/fundamentals, the new
  `wait-eodhd-reset` stage polls `GET /user` immediately, then every 10 minutes.
- Both conditions are required: provider date equals the current UTC date, and
  the finite, nonnegative request count is strictly below 5,000.
- The wait is bounded to 12 hours. Each request has a bounded timeout and no
  immediate HTTP retries; failed requests and invalid responses keep waiting.
- The successful observation explicitly replaces the local usage count with
  `/user`'s count. Existing history usage is retained up to that provider total;
  ordinary stage synchronizations still take the conservative maximum.
- Logs include provider date/count, the reset observation timestamp, and elapsed
  wait in `logs/YYYY-MM-DD-wait-eodhd-reset.log`. The timestamp is when the runner
  first observed a qualifying counter, not a claim of an exact provider reset time.
- Timeout skips the rest of the cycle, including analyze (which can fetch paid
  FX rates), runs status, and sleeps until the next scheduled start. `--once`
  also obeys the gate and exits unsuccessfully on timeout.

## Yahoo venues and live verification

Scanned all `Unsupported Yahoo exchange` entries in
`~/value-corpus/logs/2026-09-30-price-history.log`. There were seven distinct
venues: BA, BUD, F, HM, PR, PSE, RO. All seven now have suffix mappings.

On 2026-09-30, live calls through the production `fetchPriceHistory` and
`parseYahooHistory` path returned positive monthly closes:

| Venue | Mapping | Live symbol | Valid months | Latest month |
| --- | --- | --- | ---: | --- |
| PSE | .PS | PSEI.PS | 69 | 2026-09 |
| RO | .RO | TLV.RO | 120 | 2026-09 |
| BUD | .BD | OTP.BD | 120 | 2026-09 |
| HM | .HM | COP.HM | 15 | 2026-09 |
| BA | .BA | GGAL.BA | 120 | 2026-09 |
| PR | .PR | CEZ.PR | 120 | 2026-09 |
| F | .F | TW10.F | 120 | 2026-09 |

PSE limitation: PSEI.PS is an index. SM.PS, ALI.PS, TEL.PS, and BDO.PS all
returned HTTP 404. Yahoo's [exchange coverage documentation](https://uk.help.yahoo.com/kb/exchanges-markets-covered-yahoo-finance-sln2310.html)
lists Philippine Stock Exchange **indices** for `.PS`. The requested mapping is
present, but Yahoo cannot be assumed to supply Philippine equity history. These
listings can still fail when falling back from EODHD to Yahoo.

## Verification

- `npx vitest run tests/unit`: PASS — 77 files, 1,030 tests.
- `npx tsc --noEmit`: PASS, exit 0.
- `bash -n scripts/value/run-daily.sh`: PASS.
- `git diff --check`: PASS.
- Reset tests stub time and the `/user` HTTP boundary, covering a stale date,
  5,000 boundary, immediate readiness, poisoned-ledger correction, preservation
  of ordinary conservative reservations, timeout, errors/malformed counters,
  and UTC midnight during the wait.
- Runner subprocess tests stub stage execution and verify gate ordering plus
  timeout refusal to run paid stages or publish.
- The initial baseline had one failing history-budget test: a rate limiter
  retained real-time state before the test rewound the clock. Isolating that
  test's module state fixes the baseline failure without changing rate limiting.
- Diff reviewed locally; no subagents used.

The actual runner was not started, stopped, or restarted. No live EODHD paid
requests were made, and the production corpus/ledger was not modified. Only the
controller should restart the runner after merging.
