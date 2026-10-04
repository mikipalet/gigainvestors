# Agent-readable GigaInvestors

Owner authorization: 2026-10-04, “make our website agent ready too. llms.txt and anything you consider”. This change adds machine-readable representations and hidden chart text; it does not change visible chrome or implement the paid API.

## Research (checked 2026-10-04)

- [llms.txt v2](https://llmstxt.org/) proposes a small Markdown map, a single H1, summary, and H2 link lists. The [August 2026 changes](https://llmstxt.org/changes.html) recommend `rel="alternate" type="text/markdown"` and `rel="describedby"`. It is a discovery proposal, not an access-control mechanism or a promise of indexing.
- [Mintlify’s llms-full documentation](https://mintlify.com/docs/ai/llmstxt) documents the expanded-file convention. Here `llms-full.txt` contains the full shared method, numerical cutoffs, method versions, glossary, and page index, as requested; it deliberately does not concatenate every company’s time series.
- [Cloudflare Markdown for Agents](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/) documents `Accept: text/markdown` and retaining `Vary: Accept`. This implementation uses the underlying published data rather than converting page HTML, and exposes explicit `.md` URLs too.
- [Google robots guidance](https://developers.google.com/search/docs/crawling-indexing/robots/intro), [OpenAI crawler names](https://developers.openai.com/api/docs/bots), [Anthropic’s crawler policy](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler), and [Perplexity bots](https://docs.perplexity.ai/guides/bots) distinguish crawler controls from user-triggered fetching. Every specific crawler group repeats the operational-path exclusions; crawler declarations are not authentication or rate limiting. No WAF/provider settings were changed.
- [schema.org Dataset](https://schema.org/Dataset) and [SearchAction](https://schema.org/SearchAction) provide machine-readable descriptions. The search action points to a working, bounded Markdown search endpoint. [Google retired its sitelinks search box](https://developers.google.com/search/blog/2024/10/sitelinks-search-box) in 2024, so no rich-result/ranking claim is made. Company subjects use `Corporation`; they are not misrepresented as financial products sold by this site. Source licenses are retained; no blanket open-data license is invented.
- Current [MCP discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover) and [Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http) define per-request metadata, `server/discover`, mirrored headers and JSON responses. [2025 transport](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports) remains supported through `initialize`. Discovery is published at `/mcp.json` and linked from llms.txt; no invented well-known standard or external registry registration is claimed. The [official MCP registry](https://blog.modelcontextprotocol.io/posts/2025-09-08-mcp-registry-preview/) is a separate publishing service.

## Routes and data ownership

Both origins serve `/llms.txt`, `/llms-full.txt`, `/robots.txt`, `/sitemap.xml`, `/sitemaps/{pages,companies,investors,quarters}.xml`, `/search.md?q=...`, `/mcp.json`, and `/mcp`.

Main-site representations: `/index.md`, `/{CODE}.md`, `/s/{TICKER}.md`, `/about.md`, `/privacy.md`, `/newsletter.md`, `/newsletter/{issue}.md`, `/munger.md`. Investor/home/stock representations accept the main site’s quarter syntax, for example `?q=2020%20Q1`.

Value representations: `/index.md`, `/{listing-id}.md`, `/method.md`, `/year/{year}.md`, `/forward.md`, and `/index.md?q=2018Q3`. The local/path-prefixed forms work under `/value`. HTML URLs also accept `Accept: text/markdown`. Unknown historical frames return 404 rather than substituting current results. Checklist filters use the same `matchesView` function as HTML.

`lib/value/method-content.ts` is the shared literal method copy; the HTML output remains identical. `metricLabels`, `metricHelp`, `METHOD_CHANGES`, published dossiers, owner memos, price stories, browser views and local investor data supply the representations. The method/URL/text modules are shared rather than a second hand-maintained dataset.

The llms and sitemap handlers generate from the current published readers on request. They do not have an independently stale full-route cache. Value reads retain `VALUE_DATA_TAG`: the existing authenticated publication revalidation expires that data, and the next request rebuilds each artifact. Main-site holdings remain tied to their deployment’s bundled `data/store` snapshot and refresh with publication/redeployment. Main Markdown uses dynamic handlers so query-selected quarters are preserved.

The MCP is public and read-only. It supports `search_companies`, `search_investors`, `get_company_summary`, and `get_method`. It never executes a valuation pipeline, model call, write, payment, or arbitrary URL fetch. Search inputs are capped at 100 characters and 20 results; requests are capped at 16 KiB. Origins are validated against the two public origins. GET/DELETE return 405; accepted legacy notifications return an empty 202. Input failures are JSON-RPC errors; missing company/data failures are tool errors. No persistent sessions or privileged credentials are required.

## Integration with merge-1 and api-1

**Do not implement the API in this change.** `llmsText()` has a clearly labeled `## API` integration placeholder linking to `/api/v1`. api-1/merge-1 must replace that entry with the shipped payment and OpenAPI contract; the MCP discovery JSON carries the same ownership notice.

All agent/canonical URL construction lives in **`lib/agents/urls.ts`**. Current URLs intentionally remain `https://value.gigainvestors.com/{listing-id}` and `https://gigainvestors.com/s/{TICKER}`. For the migration, change the value origin/prefix and `companyUrl`/`PUBLIC_URLS.companyPath` in that module to the merged routing contract. `pageAlternates`, Markdown, JSON-LD, llms, and sitemaps consume it. Preserve `markdownRoute` before the proxy’s dossier validation and the bypass for `/md`, llms, robots, sitemap and MCP endpoints when reconciling proxy changes. The main `/s/{TICKER}.md` response already joins public checklist/memo/story content when a US dossier exists.

## Verification

- `npx vitest run tests/unit/agents tests/unit/value/proxy.test.ts tests/unit/value/robots.test.ts`
- `node scripts/agents/http-check.mjs http://127.0.0.1:3097` checks both Host variants, Markdown/content negotiation, artifacts and MCP. Native HTTP preserves the Host header for this multi-domain check.
- `scripts/agents/visual-check.mjs before|after <base> <output>` captures all four owner viewports and retains raw changed-pixel counts; visual differences use the existing change-review threshold of 0.2%. Before captures must come from the unchanged checkout; do not regenerate them from the changed code.
- `node scripts/agents/browser-check.mjs <base>` verifies live quarter text, a single matching Markdown alternate, and that hidden chart data does not change drawer font fitting.
- The existing `scripts/value/release-gate.mjs` and `scripts/value/change-review.mjs` remain the release controls. See the task report for exact results and limitations.

Build output is restricted to `.next`. Nothing in this task deploys or pushes production.
