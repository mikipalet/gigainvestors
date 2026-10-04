# Paid agent API implementation plan

Owner specification: 2026-10-04 10:43, paid derived-data REST API, x402 only.

Architecture: one versioned GET router, explicit derived-data projections, shared pricing/route registry and Zod response contracts (also generating OpenAPI 3.1). A route-handler payment middleware uses the maintained x402 facilitator client. Build the response before settlement; store an immutable request fingerprint and pending/complete journal before/after settlement. Local exclusive file creation supports development; shared Redis supports Vercel. Never retry an indeterminate settlement automatically. Safe usage metadata goes to local JSONL or Blob.

Constraints: no subagents, no receiving private keys, no accounts/API keys/Stripe; Base Sepolia default, explicit receiving address required. No production deploy or master push. Build only in .next. Stop and commit below 4 GB free.

- [ ] Test pricing, contract coverage, derived-only projections, payment challenge, verification failure, failed handler, settlement failure, retry and concurrent deduplication.
- [ ] Implement strict query validation and adapters for investors, search, dossiers, checklist, quarterly views, method/changelog, forward record and bulk export.
- [ ] Implement payment journal, facilitator adapter, response caching, safe usage logging and admin summary.
- [ ] Add free discovery, OpenAPI, agent guide, llms.txt and existing footer links.
- [ ] Run unit/schema tests, typecheck and .next build. Push only value-zv-api for preview; check free/paid responses. Run funded testnet payment only when TEST_PAYER_KEY exists.
- [ ] Write cited owner report and commit with requested message.

Licensing: never expose raw prices, statement series, Dataroma share/value/percentage rows. Investor holdings expose derived ranks, normalized weights computed from values, position changes and concentration summaries. Dossier series use an explicit computed-metric allowlist; memo/story charts exclude raw-money series. Raw annual history is unavailable by design.
