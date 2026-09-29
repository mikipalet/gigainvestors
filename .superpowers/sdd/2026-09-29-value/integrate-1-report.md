# Integration 1

STATUS: PASS. Merged Tasks 10 (`value-f-analyze`) and 11 (`value-g-publish`) into `value` in the existing isolated worktree.

Conflicts resolved:
- `lib/value/fx.ts` (add/add): kept one exported API, `createUsdRate`. Default/`{ force }` mode returns an async currency lookup with the daily corpus cache; `{ rates }` mode supplies a synchronous lookup for publish/build-output without network access. Both use the same denomination conversion: GBX and GBp = GBP/100, ZAc = ZAR/100. Invalid currencies/rates return null. Requests share major-currency rates and refresh across UTC dates.
- Universe and fundamentals retain their compatible factory calls. Bond-yields/tradingRate and analyze now use that factory; analyze shares one lookup across its run and forwards force. Publish/build-output's duplicate conversion helper was removed in favor of the same API; stored trading valuations and missing-FX behavior remain intact.
- `lib/value/config.ts` (content conflict): retained Track A's integrity, fundamentals and EODHD settings alongside Task 11's publish count-drop and lock limits. Other configuration and type additions merged cleanly.

All existing tests retained; four FX regressions added for cached/supplied parity, minor units, concurrent request reuse, UTC rollover, force refresh and invalid rates.

Validation on the combined tree:
- `npx vitest run tests/unit`: 28 files, 370 tests passed.
- `npx tsc --noEmit`: exit 0, no diagnostics.
- `git diff --cached --check`: clean.

Task 10 merge commit: `5ba4886`. This report is included in the Task 11 merge commit. Generated TypeScript incremental-cache changes were discarded. No remote publishing was performed.
