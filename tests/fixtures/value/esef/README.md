Recorded from filings.xbrl.org on 2026-09-29. Tests replay these local files and never contact the service.

- `filings-asml.json`: unmodified response from https://filings.xbrl.org/api/filings?filter%5Bentity.identifier%5D=724500Y6DUVHQD6OXN27&sort=-period_end&page%5Bsize%5D=1
- `asml-report.xhtml`: https://filings.xbrl.org/724500Y6DUVHQD6OXN27/2025-12-31/ESEF/NL/0/asml-2025-12-31-1-en/reports/asml-2025-12-31-1-en.xhtml

The original report was 47,105,109 bytes. This 1,800,354-byte text-focused fixture removes scripts, styles, ix:header, attributes, inline wrappers, and table layout wrappers, and collapses adjacent div wrappers. It retains source wording, entities, heading order and block boundaries throughout the report, including compensation, risk, notes, auditor and definitions. No synthetic source prose or headings were added. Wrapper normalization makes this a parser fixture rather than a valid standalone ESEF filing.

The API provides `date_added`, not the regulator's filing timestamp. `ReportMeta.filed` uses its ISO date portion. `period` comes from `period_end`; `report_url` is the XHTML report, not `viewer_url`.

The cutter recognizes short standalone multilingual headings, excludes repeated navigation triplets and numeric TOC entries, and stops before a definitions/glossary table. The first substantive occurrence wins; later larger occurrences replace short TOC-like blocks. ASML's `Board of Management remuneration` heading is recognized in addition to the specified remuneration headings. Each section ends at the next recognized heading and is capped using the shared section budgets. When fewer than two distinct usable section keys are found, only `business` is returned, containing the first 8,000 estimated tokens of the whole document. This fallback does not assert that a business heading was found.
