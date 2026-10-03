# Story 2b — disk-stop checkpoint, not release-ready

Stopped 2026-10-03T11:22:06.624575+00:00. **Both source jobs observed less than 5 GiB free and logged DISK STOP.** Free space subsequently recovered, but the stop condition was honored. Remaining news workers were explicitly terminated: the shared pool otherwise lets other workers continue after one rejects. The story guard now latches a floor crossing for the life of its process.

No push, deploy, remote publish, subagents, text-generation calls, API-key output or new build occurred. Existing `.next` was unchanged. Shared chrome and every UI component remain byte-identical to `47b3812`.

## Collection and coverage

- Published universe: 2,708 unique dossiers; the prior report explains the NWS alias from 2,709 IDs.
- News cached today: **704/2,708 companies**, 673 with articles, **412,496 retained rows** containing titles and first paragraphs.
- 462 first pages exhausted the requested range; 242 reached the 1,000-row limit and remain incomplete. For high-volume companies a page can cover only days; an 18-month query does not establish complete coverage.
- Durable reservation: **755 attempts = 3,775 calls**, below the 20,000-call cap. Interrupted and failed attempts remain charged to the local cap. No retries were enabled.
- Corrected queue: 19 Buy now, 282 Next closest, 388 index members, then 2,019 others. The initial 44 reservations used market-cap ordering before the index array/packed parsing error was corrected. Restarts used the requested priority order.
- Offline candidate preparation completed for 2,708 dossiers. Live selection completed **14/40** calibration companies. Private selections: price 4, risk 3, pricing 0; 6 headline events. These are **ungraded**, not published coverage.
- No local publication was regenerated. The prior local snapshot remains at 2,708 computed price lines, 590 computed Q3 lines, six literal Q3 lines, zero quoted price lines and zero Q6 lines. No new thirty-line samples are claimed.

## Calibration

**The >=90% target is not achieved.** The forty-company labels were not relabelled or graded against this partial run. Prior literal-2 calibration cannot authorize literal-3 selections. Publication trust remains closed. No score threshold was lowered; abstentions receive no correctness credit.

Root causes addressed:

- News headlines lacked first-paragraph context in Jev input. The literal headline is now scored with that context.
- Fuller retained filings existed in flags/sources and judgement/sources for 28 calibration companies; these are now read without downloading filings.
- Long risk headings can be scored up to 80 words/650 characters. Display permits only the full heading or a literal first sentence/clause fitting the 18-word attributed budget, without arbitrary word truncation.
- The selector discarded remaining tournament finalists when the first winner failed scoring. Its regression now passes by trying other finalists; the 1.7/2 per-dimension gate is unchanged.
- Risk table labels such as Principal risk Outlook and page references are rejected.

Remaining misses: ADBE's CEO-transition proposal concerns a one-day move rather than necessarily its multi-year decline; NVDA supply commitments failed causality; KO/JPM headlines failed specificity; Toyota has no extracted risk heading; Close Brothers' table layout yielded a false heading label. Short-term events cannot automatically count as correct long-term main drivers.

The completed readings came from the process started before the final tournament-fallback edit. **Rerun all forty with --force before hand-grading.** These partial records are not final-code calibration.

## Named companies and screenshots

No new screenshots were taken. All prior eight-company line/drawer pairs at both 1728x970 and 2056x1180 remain under `.story-2/screens-final/`, as baseline evidence only. Proposed source readings below are not approved published lines.

### ADBE.US

- price: rejected — "Adobe stock drops on surprise CEO transition" (finance.yahoo.com, 2026-09-04); scores {"causality": 1.9, "specificity": 1.57}.
- risk: rejected — "Issues relating to the development and use of AI in our solutions may result in reputational harm, liability and adverse business and financial results." (SEC filing, 2026-01-15); scores {"materiality": 0.9, "specificity": 0.36}.

### NVDA.US

- price: rejected — "NVIDIA's $279B Supply Commitments: Can These Secure Its Growth Runway?" (finance.yahoo.com, 2026-09-24); scores {"causality": 0.96, "specificity": 1.98}.
- risk: selected, ungraded — "Over the past three years, we have been subject to a series of shifting and expanding export control restrictions, impacting our ability to serve customers outside the United States." (SEC filing, 2026-02-25); scores {"materiality": 1.75, "specificity": 1.95}.

### KO.US

- price: rejected — "Coca-Cola Q2 2026 earnings beat, full-year forecast raised" (finance.yahoo.com, 2026-07-28); scores {"causality": 1.57, "specificity": 1.45}.
- risk: rejected — "Public debate and concern about perceived negative health consequences of processing and of certain ingredients, such as nutritive and non-nutritive sweeteners, color additives and biotechnology-derived substances, and of other substances present in our beverage products or packaging materials, may reduce demand for our beverage products or result in additional governmental regulation." (SEC filing, 2026-02-20); scores {"materiality": 1.12, "specificity": 1.04}.

### LULU.US

- price: rejected — "The removal of this exemption increased the cost of fulfilling those orders." (SEC filing, 2026-03-17); scores {"causality": 0.97, "specificity": 1.78}.
- risk: rejected — "Our business could be negatively affected as a result of actions of stockholders, activists, or shifting consumer sentiment." (SEC filing, 2026-03-17); scores {"materiality": 0.96, "specificity": 0.8}.

### GOOGL.US

- price: selected, ungraded — "Alphabet shares up in premarket trade after Gemini 4 Argon launch" (finance.yahoo.com, 2026-10-01); scores {"causality": 1.95, "specificity": 1.95}.
- risk: rejected — "We generate a significant portion of our revenues from advertising. Reduced spending by advertisers, a loss of partners, shifts in online advertising, new and evolving advertising formats, or new or existing technologies that block ads online or affect our ability to personalize ads could harm our business." (SEC filing, 2026-02-05); scores {"materiality": 1.79, "specificity": 1.62}.

### 7203.JP

- price: no selected source.
- risk: no selected source.

### JPM.US

- price: rejected — "JPMorgan Chase stock rises after upbeat revenue outlook" (finance.yahoo.com, 2026-09-15); scores {"causality": 1.93, "specificity": 1.17}.
- risk: rejected — "Changes in the requirements for the regulatory evaluation of JPMorganChase’s resolution plan could increase its funding or operational costs or require restructuring or curtailment of its businesses." (SEC filing, 2026-02-13); scores {"materiality": 0.92, "specificity": 1.9}.

### CBG.LSE

- price: rejected — "Overall, the group’s expense/income ratio increased to 65% relation to motor finance commissions." (CBG filing, 2025-10-03); scores {"causality": 0.92, "specificity": 1.9}.
- risk: rejected — "Principal risk Outlook" (CBG filing, 2025-10-03); scores {"materiality": 1.55, "specificity": 1.81}.

## Rejection histogram

Partial completed readings only; not the final-code universe run.

| Type | Reason | Count |
|---|---|---:|
| price | gap-wording | 4 |
| price | long-or-broken-excerpt | 16185 |
| price | no-supported-choice | 503 |
| price | score-below-gate | 9 |
| price | targets-ratings-sentiment-listicles | 861 |
| price | unanchored-cause | 12 |
| risk | gap-wording | 1 |
| risk | generic-risk | 48 |
| risk | score-below-gate | 10 |
| pricing | long-or-broken-excerpt | 55 |
| pricing | no-supported-choice | 3 |
| pricing | score-below-gate | 10 |

## Verification and disk

- Five focused suites passed **125 tests** before the final fallback edit. After that edit the selected-source suite passed **16/16**, including its new regression. Clause extraction, missing context and discarded-finalist regressions were observed failing before fixes.
- Eleven runner tests initially failed because the actual host fell below the runner's unchanged 6 GiB floor. A deterministic test-only disk fixture and explicit low-disk stop case resolved them. The production runner threshold was not changed.
- Code review kept clause trimming in the browser-safe composer, avoiding Node crypto in the client Price story import path. This helper relocation and the stop latch were checkpoint fixes after the stop, without another test run.
- git diff --check passed. No new TypeScript check, build, full-store/browser consistency audit or four-viewport release gate ran. These remain required.
- Read-only review of prior four-viewport reports found zero cut/overlap issues, but this does not verify refreshed stories. Prior failures include search popovers classified as full-height drawers and whitespace. No gate was weakened.
- Six previously fingerprinted chrome files still match SHA-256. No UI files are in this diff. Full changed-code diff reviewed.
- New allocation: **81,014,784 bytes (77.3 MiB)**, below 1.5 GB. Run growth ceiling was 1.4 GB, reserving space for reporting/commit. No build output or raw article/PDF intermediates were created. News is gzip-compressed in ~/value-corpus/price-story/news. Candidate/readings, durable budget ledger and small evidence logs are retained; temporary failing-test logs removed. Prior screenshot evidence preserved.

## Every changed file

- `lib/value/price-story/compose.ts` — Trim Q6 only at a literal source sentence/clause boundary within the attributed word budget.
- `lib/value/price-story/corpus.ts` — Read fuller retained filings and enforce configurable, latched disk limits.
- `lib/value/price-story/publication.ts` — Require the current selection version for calibration trust and reading freshness.
- `lib/value/price-story/selection.ts` — Add headline context, admit long risk headings, reject table labels, and try remaining finalists.
- `scripts/value/cli.ts` — Expose cached-news-only selection.
- `scripts/value/stages/price-story.ts` — Use cached news without paid fetches and configure bounded selection concurrency.
- `scripts/value/story-2b-news.ts` — Fetch prioritized resumable news under a persisted 4,000-attempt cap.
- `tests/unit/value/selected-sources.test.ts` — Cover literal clauses, headline context and finalist fallback; update version fixtures.
- `tests/unit/value/ops-integration.test.ts` — Isolate disk-dependent tests and verify the low-space stop path.
- `.superpowers/sdd/2026-09-29-value/story-2b-report.md` — Record the incomplete checkpoint, measured results and outstanding acceptance work.

The same report is copied to the explicitly requested sibling path `/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/story-2b-report.md`; no application code there was changed.

## Resume after new authorization

Continue the dated attempt ledger; never reset it. Finish first-page collection and bounded pagination/historical event coverage. Rerun selection with final code, hand-review all forty, then regenerate the grade; keep publication blocked until >=90% is measured. Next run the normal local publisher, produce thirty random lines per type and the eight screenshot pairs at both sizes, and complete consistency plus four-viewport gates. No push, deploy or remote publication is authorized.
