Recorded from filings.xbrl.org on 2026-09-29. Tests replay these local files and never contact the service.

- `filings-asml.json`: unmodified response from https://filings.xbrl.org/api/filings?filter%5Bentity.identifier%5D=724500Y6DUVHQD6OXN27&sort=-period_end&page%5Bsize%5D=1
- `asml-report.xhtml.gz`: https://filings.xbrl.org/724500Y6DUVHQD6OXN27/2025-12-31/ESEF/NL/0/asml-2025-12-31-1-en/reports/asml-2025-12-31-1-en.xhtml

The original report is 47,105,109 bytes. `asml-report.xhtml.gz` contains the
complete XHTML with only embedded image data URIs removed, compressed with gzip
(1,909,736 bytes). All original text, element nesting, inline styles, class names,
and stylesheet rules are retained. Tests decompress it in memory and exercise the
same XHTML input path as production. This replaces the old text-only
`asml-report.xhtml` fixture, which stripped the typography needed to distinguish
headings from wrapped body lines.

Reproduction after downloading the source URL above to `/tmp/asml-original.xhtml`:

```python
import gzip
import re
from pathlib import Path
source = Path("/tmp/asml-original.xhtml").read_text()
source = re.sub(r'data:image/[^\s"\)]+', '', source)
Path("tests/fixtures/value/esef/asml-report.xhtml.gz").write_bytes(
    gzip.compress(source.encode(), mtime=0)
)
```

The API provides `date_added`, not the regulator's filing timestamp.
`ReportMeta.filed` uses its ISO date portion. `period` comes from `period_end`;
`report_url` is the XHTML report, not `viewer_url`.

Heading detection runs before flattening, using short block text and inline or
class-based font sizes/weights. Repeated headings (more than three occurrences)
are ignored. Sections require 1,500 body characters. ASML assertions check actual
lithography business prose, a substantial risk block, Board of Management
remuneration, absence of a spurious MD&A section, and navigation-free starts.
