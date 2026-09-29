# Wire 1: enriched company reads

STATUS: integration fix complete; live acceptance PARTIAL. SAP.XETRA is description, not the requested ESEF, because filings.xbrl.org returns zero filings for its correct LEI. The other five requested kinds match.

## Changes

- Added `loadCompanies({ only, limit })`: universe order, filtering before limiting, optional enriched company overlays, non-null enrichment wins, and null enrichment preserves known universe values.
- Reports now use the loader. Reviewed every stage in this branch: universe produces the input; fundamentals intentionally keeps its existing order and does not consume CIK/LEI/description. No other consumer needs updating.
- Verified the existing description-only writer with a regression test: enriched description creates `business.txt` and `sections: ["business"]`.
- The first live run exposed a separate ESEF CSS performance bug: the unanchored declaration regex rescanned base64 image suffixes. ASML advanced only 28 KB over several minutes. Anchored CSS declaration parsing at declaration boundaries; a subprocess regression failed at its five-second timeout before the fix and passed in about 0.3 seconds after it. This narrow fix was needed to finish the required real run.

## Validation

- `npx vitest run tests/unit`: PASS, 21 files, 236 tests.
- `npx tsc --noEmit`: PASS.
- Loader regression: overlay and description-output assertions failed before the fix, then passed.
- Unit corpora use `os.tmpdir()` and are removed after each test. Tests do not use the network.
- Required real command below: exit 0 after the CSS correction. Every company has a nonempty `business.txt`.

```sh
VALUE_CORPUS_DIR=$HOME/value-corpus npm run value -- reports --only=KO.US,AAPL.US,ASML.AS,SAP.XETRA,MC.PA,2330.TW --force
```

## Live corpus results

Read directly from `~/value-corpus/reports/{id}/meta.json` and `business.txt` on 2026-09-29T11:44:15.040389+00:00. Excerpts preserve the first 150 characters verbatim.

### KO.US

```json
{
  "kind": "10-K",
  "sections": [
    "business",
    "risk",
    "mdna",
    "capital",
    "notes",
    "auditor",
    "compensation"
  ]
}
```

First 150 characters of `business.txt`:

```text
ITEM 1. BUSINESS

In this report, the terms “The Coca-Cola Company,” “Company,” “we,” “us” and “our” mean The Coca-Cola Company and all entities inclu
```

### AAPL.US

```json
{
  "kind": "10-K",
  "sections": [
    "business",
    "risk",
    "mdna",
    "capital",
    "notes",
    "auditor",
    "compensation"
  ]
}
```

First 150 characters of `business.txt`:

```text
Item 1. Business

Company Background

The Company designs, manufactures and markets smartphones, personal computers, tablets, wearables and accessorie
```

### ASML.AS

```json
{
  "kind": "ESEF",
  "sections": [
    "business",
    "risk",
    "compensation",
    "notes",
    "auditor"
  ]
}
```

First 150 characters of `business.txt`:

```text
Our business strategy

Our six priorities will drive long-term growth. Over the following pages, we expand on our progress in 2025.

1Deepen customer 
```

### SAP.XETRA

```json
{
  "kind": "description",
  "sections": [
    "business"
  ]
}
```

First 150 characters of `business.txt`:

```text
SAP SE, together with its subsidiaries, provides enterprise application and business solutions worldwide. It offers SAP Business AI; SAP S/4HANA that 
```

### MC.PA

```json
{
  "kind": "ESEF",
  "sections": [
    "business",
    "risk",
    "compensation",
    "auditor"
  ]
}
```

First 150 characters of `business.txt`:

```text
Présentation des activités, faits marquants et perspectives

1. Vins et Spiritueux

1.1 Les marques des Vins et Spiritueux

1.2 Position concurrentiel
```

### 2330.TW

```json
{
  "kind": "description",
  "sections": [
    "business"
  ]
}
```

First 150 characters of `business.txt`:

```text
Taiwan Semiconductor Manufacturing Company Limited, together with its subsidiaries, manufactures, packages, tests, and sells integrated circuits and o
```

## SAP acceptance blocker

Enriched SAP company: `country: DE`, `lei: 529900D6BF99LW9R2E68`, `cik: null`. The LEI resolves to SAP SE in [GLEIF](https://api.gleif.org/api/v1/lei-records?filter%5Blei%5D=529900D6BF99LW9R2E68).

Both the [filtered filings endpoint](https://filings.xbrl.org/api/filings?filter%5Bentity.identifier%5D=529900D6BF99LW9R2E68&sort=-period_end&page%5Bsize%5D=1) and [entity filings relationship](https://filings.xbrl.org/api/entities/529900D6BF99LW9R2E68/filings) returned `data: []` and `meta.count: 0` during verification. The [entity endpoint](https://filings.xbrl.org/api/entities/529900D6BF99LW9R2E68) resolves to SAP SE, so this is not a missing identifier.

The static [SAP archive](https://filings.xbrl.org/529900D6BF99LW9R2E68/) lists only a 2020-12-31 report outside the current API index. No hardcoded historical-report override or corpus metadata alteration was made. Meeting the requested SAP ESEF result requires restored upstream API coverage or a separate report-discovery fallback.
