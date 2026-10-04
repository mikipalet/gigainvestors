# value.gigainvestors.com: design contract (owner rules, binding for every change)

Every rule below came from the owner. A release that breaks one does not ship.
The release gate (`scripts/value/release-gate.mjs`) checks the measurable ones; the controller
checks the rest by looking at the screenshots at the owner's sizes before every deploy.

## Screens
- Owner's screens: MacBook Pro 16" = 1728x970 and 2056x1180 (browser viewport). Also 1440x800 and phone 390x844.
- One page, no scroll, on desktop (home and every company page). Phones may scroll inside sections only.

## Text
- Little text; labels only where a first-timer cannot proceed without them. No kicker lines, no duplicate links.
- Nothing below 13px. Plain language everywhere; no formulas on the page (formulas live in drawers under 'How we decided').
- Never cut text with an ellipsis on the page (descriptions are complete sentences).
- No text overlapping other elements in any state (hover, drawers, filters, scrubbing).
- Never user-visible gap or work wording: 'not enough data', 'Not reported', 'unavailable', 'unclear', 'not tested', 'verify', 'being checked', 'not supplied', 'informational only', 'available evidence'. If data is missing, show less, never explain absence.
- English company names; no CJK-only names.

## Density and whitespace
- Information dense but simple. No large empty areas on pages, cards or drawers.
- Drawers: fill the panel; empty area < 8% of the panel; no tabs; no inner scroll on desktop.
- Every drawer is a full-height side panel (top = 0, bottom = viewport height on desktop); phones get a full-screen sheet.
- List drawers size rows to the panel height (no gap under the pager, nothing clipped).
- Prefer making a drawer smaller over leaving empty space in it, EXCEPT across companies: a drawer type keeps ONE width per screen size for every company and every time-travel frame (owner 2026-10-02 14:41: "this drawer changes size depending on the company"). Text size and inner columns adapt; width never does. Short content may leave a modest strip (gate empty-area fails up to ~25% raster are accepted for fixed-width drawers; cut/overlapping text never).

## Colour and emphasis
- Strong colour once per screen (rank-1 buy card only). Others tinted or outlined. Red only for real failures.
- Our own components; never browser-native selects. Searchable dropdowns for long lists; list scrolls, never paginates inside a popover; selected = check mark, not a black fill.

## Interaction and chrome
- No top header; bottom bar like gigainvestors.com (time travel left, buttons right). No Play button.
- Arrow keys step time travel from anywhere (same as gigainvestors.com).
- Every chart is hoverable (nearest point crosshair + tooltip at the pointer); tooltips next to the pointer, never fixed corners.
- Fast: interactions < 100 ms desktop; home post-load transfer <= 250 KB; CLS 0.

## Content and data
- Show the answer directly with percentages ('Buy now', expected return); not a research list.
- Same number everywhere (cards, tiles, drawers, charts use the same series, years, basis, rounding).
- Expected return and buy price come from one valuation; a tile's sentence states the rule actually applied and the chart shows the series the rule uses.
- Logos for 100% of published companies; no blank logo slots.
- 'The business' is ONE section: the owner's memo, seven questions (how it makes money, why customers stay, can it raise prices, where the cash goes, are managers owners, what could break it, what the price says), one line each (<= 18 words) carrying a number or a named fact; flags fold into the relevant line; one drawer behind it. No extra page height. Every published company, not only key ones.
- Human judgement visible and evidence-backed; no precise-looking false precision.

## Process
- Before every deploy: run the release gate on a local build at all four sizes, then open and look at: home, 'Buy now' drawer, 'Next closest' drawer, a buy dossier, ADBE, GOOGL, KO, JPM, each dossier drawer incl. 'The business, in depth', filters open, time travel to 2011.
- Never ship a change whose screenshots were not looked at.

## Judgement rule (owner 2026-10-01 22:14: "how does Alphabet pass if its minimum is 0.8?")
- A judgement may correct an INPUT with quoted evidence (e.g. growth capex -> upkeep = depreciation). It may never pass a result that is still below the bar ('close enough' is forbidden). The verdict always follows the bar on the numbers shown.

## Change control (owner 2026-10-02: "review changes urself so things like the search can't happen again. don't want to babysit you")
- Every brief carries a SCOPE LOCK: change only what the brief names; shared chrome (search, bottom bar, time slider, filters, side panel shell) stays identical to gigainvestors.com unless the owner asked.
- Before every deploy the controller runs `node scripts/value/change-review.mjs <candidate> <out>` (live vs candidate, same states) and opens EVERY side-by-side pair it writes. Each changed state must trace to an owner request or a named bug fix; anything else is reverted before deploy. A change to a shared-chrome file blocks unless requested.
- The controller also reads `git diff --stat <live>..HEAD` and the full diff of every UI component touched.

## One product (owner decision 2026-10-04 10:40)
- One site: checklist home /value; one company page /s/<TICKER>. US ticker has no .US; other exchanges retain suffix. The former value host uses 308 redirects preserving queries.
- Shared brand: GigaInvestors at top left, without a navigation header. Shared bottom bar: time travel left; search, Method where relevant, newsletter and contact right. Checklist lists alone have Western-markets toggle. A compact Investors/Checklist link connects the two entry points.
- Type scale: 13px minimum labels; 14–16px body; 18–26px headings; larger figures only for primary answers. Treemap labels are complete or omitted if the cell cannot contain them; accessible names retain the content.
- Colour meaning: existing checklist palette retained (muted green quality pass, green fair/buy price, red real quality failures). Buying activity uses a neutral solid outline; selling uses neutral hatching; sold uses a dashed outline. Activity must never masquerade as a checklist verdict.
- Dossier content occupies the company page. A compact quarter-specific holders strip opens the shared full-height drawer; shares-held/price chart lives in that drawer. No holder data means no strip and no reserved space. 13F-only pages retain the holders composition with shared chrome.
- Every drawer type has one width at each viewport; the holders drawer is 560px on desktop and viewport width on phones. All evidence drawers retain their fixed per-type widths.
- Scope authorization for this merge includes routing, search, bottom bar, timeline, common typography, verdict marks and activity texture. Changed states must be compared against BOTH former live sites and explained in merge-1-report.md.
