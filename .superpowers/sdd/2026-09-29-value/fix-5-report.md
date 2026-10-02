# Fix 5 report — stopped at the disk guard

## Completed: nightly preservation

Commit `df131d7` — `value: nightly publish keeps quarters and memo`.

- Promoted the audited quarterly-1 source into the normal corpus history path. Plain publish regenerates its browser views and summaries without the integration attachment script.
- Prevented newer annual-only runs from replacing quarterly history.
- Seeded a separate published-memo fallback from the live staged store. New research answers take precedence; an omitted answer retains the live answer, subject to the public consistency gate. Backfill research files were not modified.
- Ran local `publish --out` and compared with integrate-4/store: all 87 quarterly frames identical; global and western perQuarter summaries identical; all 87 quarterly view sets present; identical set of 2,708 published dossiers. Toyota, Adobe, Alphabet, Coca-Cola, JPMorgan and Wolters Kluwer memo answers match exactly.
- Concurrent research changes elsewhere mean this is not a whole-store byte-for-byte identity claim. Comparison evidence: `/Users/miki/value-corpus/staging/fix-5-nightly/comparison.json`.
- Publication/history tests: **62 passed, 0 failed**.
- Advanced the clean, isolated, detached `value-daily` checkout from ba62d31 to df131d7. Its existing sleeping runner will use the updated CLI at the next scheduled cycle. No cycle, remote publish, push or deployment was invoked.

Details: `fix-5-nightly.md` alongside this report.

## Required stop

The user required a stop with a commit below 6 GiB free. The local baseline production build passed compilation and TypeScript, then prerendered 8,218 routes. Free disk fell to **6,149,444 KiB (5.86 GiB)**. The build was interrupted. Its incomplete `.next` output (created solely by this task) was deleted to recover space and keep retained additions below the 2 GB budget. Work was not resumed after cleanup.

Turbopack could not follow this worktree's external node_modules symlink; the baseline attempt used `next build --webpack`. No successful production build, screenshots, consistency audit or four-viewport release gate was completed. There are no before/after images to report.

## Investigated, not implemented

1. **Toyota split basis:** corpus Toyota has no `splits` array. FY2013–17 shares are about 3.0–3.2 billion, while FY2018 onward are about 13–15 billion: comparative years were already restated for the October 2021 5:1 split. `history-split-basis.ts` contains Toyota's issuer-confirmed action but only compares the years immediately straddling the action date, where both observations are already adjusted. Current analysis does not apply that helper. The proper fix must reconcile mixed comparative bases without double-adjusting already restated years. The EODHD daily ledger is already at 100,000 requests, so fresh endpoint work cannot proceed on today's budget. No universe split audit or ten-filing spot-check was completed.
2. **Verdict:** `humanVerdict` in `lib/value/judgement/apply.ts` only receives buy/price-known booleans, so every quality-pass non-buy gets the expensive-price wording. It needs the actual price/value relation from DossierContent and boundary tests.
3. **Adobe ROIC:** raw displayed ROIC observations are 3.4224555735 (FY2020) and 4.8844488828 (FY2021). The existing metric formatter caps capital-return percentages, but BusinessDepth's memo table omits the `returnRatio` flag. Its change column also prints raw percentage-point differences. The calculation uses equity + debt + leases − cash − goodwill; numerical denominator verification against filings remains outstanding. Tests must retain the rule's underlying basis.
4. **Q2 window:** `numericMemo` explicitly filters FY2021–23 and prints that fixed text. This must become the latest three consecutive fiscal years, and published computed memo lines must be refreshed without overwriting the parallel research job's files.

Tasks 2–5 remain unfinished. The second requested implementation commit was not created. No subagents were used and no API keys were printed.
