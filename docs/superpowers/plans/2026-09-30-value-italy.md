# Italy and download ordering

User-approved scope: Italy from ESEF, home-listing deduplication, Yahoo prices, Western-first cap-aware downloads, live corpus run, recorded tests, report and local commit. No publishing or subagents.

Architecture: Euronext Milan/Growth CSV supplies ISINs and symbols; GLEIF resolves LEIs; paginated filings.xbrl.org metadata supplies annual XBRL-JSON extracted from iXBRL and the matching report XHTML. Cache immutable filings and checkpoint companies. Normalize only annual consolidated facts with correct units and exclusive period ends, preserve missing values, and run the existing integrity gate. Merge by LEI/ISIN or unambiguous issuer name, preferring Milan. Retain Italy across universe refreshes. Fetch Yahoo quotes and monthly prices locally.

- [x] Record source fixtures and regression tests for annual facts, periods, dimensions, share units, issuer merging and cap ordering.
- [x] Implement Italy source modules and resumable stage; extend provider routing and retention.
- [x] Enrich missing caps using cached shares/caps and free Yahoo data before download selection; Western venues first, cap descending, unknown venue importance; refresh age breaks remaining ties.
- [x] Run Italy against VALUE_CORPUS_DIR=$HOME/value-corpus, verify five named issuers against filing facts, record coverage gaps honestly.
- [x] Run npx vitest run tests/unit and npx tsc --noEmit. Write italy-1-report.md and STATUS; commit requested message, no push.

Constraints: no network in tests, null is missing, absolute reporting-currency units, spending positive, numeric thresholds in config.ts, secrets only from env, no changes to site behavior.
