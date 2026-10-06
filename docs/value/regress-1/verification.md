# Verification and self-review

No subagent was used. The final source-scale implementation was reviewed against the requested cases and its complete tests. Units and precision stay distinct; no issuer-specific scale exception was introduced. The completion guard uses the existing capital-event context, and the full suite verifies the legitimate event cases. No approval manifest, explicit freeze, integrity boundary or publish invariant was relaxed.

The final production change was tested by the full 247-file / 2,415-pass unit suite and the successful production webpack build. Later changes were harness, evidence and report files only. The final source replay receipts agree on an unchanged implementation hash. All nine original raw value losses are restored, with eight visible publicly; MRK.XETRA remains a separate publication-share-check residual.

The real publication gate and browser gate are red, as recorded in report.md. The complete nightly attempt also has 88 unavailable/changed cached-reading failures. These are release blockers, not passing checks. The 4 GiB disk floor was never crossed.

The bundle's 114,816 overlay entries were individually hashed from the archive, all six then-current artifacts matched their checksums, 571,351 source bindings were present, and all 88 failed-cache analyses were excluded. The final evidence archive is repacked after cleanup and checksummed separately. The credential scan checked 115,831 files against 11 known credential values, with zero matches; values were never emitted.

Scratch cleanup restored the pre-existing tracked tsconfig.tsbuildinfo from HEAD after removing generated build output, so the baseline file is unchanged. No live corpus file or daily-runner lock was changed. Controller instructions remain guarded by READY and have not been executed.
