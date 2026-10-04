# Cover-2 evidence

The isolated corpus is `~/data/value-cover`; raw filings and responses stay on the
data volume under `held-validation/raw` and `held-validation/mappings`.

- `original-mismatch-resolutions.json` records all nine original causes, the old
  provenance and the matching-period/basis independent checks after correction.
- `sample.json` fixes both samples and the new population/seed. `second-source.json`
  contains all 120 checks; no tolerance was widened or company substituted.
- `financial-audit.json` records the latest consolidated revenue source for all
  158 financial additions. `financial-revenue-changes.json` lists the 109 changed
  latest revenues, including 20 insurers. `correction-summary.json` identifies
  the full historical correction journal and its SHA-256 on the data volume.
- `source-bases.json` holds evidenced ADS ratios, reporting dimensions and custom
  accounting concepts. Numeric selection is generic; there are no ticker
  conditionals in the correction pipeline. The two `*-reviewed-annual.json`
  files explicitly label PDF transcriptions with source URLs and pages.
- `mapping-resolutions.json` contains the 109 original identity decisions plus
  CET and CCXI exclusions discovered during review. Public SEC, issuer and free
  OpenFIGI evidence supports the decisions; requests/responses are archived.
- `analysis-source-binding.json` connects the forty source checks to current
  analysis inputs. `staged-analysis-binding.json` checks publication retains
  the reanalysed input hashes and numeric series.
- `coverage-summary.json` and `coverage-ledger.json` prove scope and baseline
  immutability. `progress.json` lists every pending input, including 119
  fundamentals blocked by quota. `quota.json` records the shared conservative
  ledger and the 40,000-call nightly reserve.
- `verification.json` and `release-gate-summary.json` record actual outcomes,
  including any failed gate. A failed gate is not waived by passing main pages.

No remote data publication or revalidation is performed by this evidence bundle.
