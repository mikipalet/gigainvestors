# Held-company coverage

The owner's specification authorizes execution in this worktree without delegation.

- [x] Derive the latest eight quarters from the tracked-investor store. Audit every stock record, keeping outside-window records separate from security exclusions. Prefer exact US symbols, then CUSIP/ISIN; never guess a renamed/delisted issuer from its ticker stem.
- [x] Store holdings membership independently of index membership. Reuse provider classifications and cached source documents. Unresolved identities remain explicit pending work.
- [x] Add local-only additions publication, preserving all baseline dossiers and index rows. Include held companies in normal publication selection; retain current Western and short-history rules.
- [ ] Prepare an isolated corpus under ~/data, snapshot baseline hashes, and execute only missing addition inputs. Check provider usage before paid work, checkpoint after each stage, and stop at quota for controller relaunch.
- [ ] Stage publication; compare old records exactly; audit held coverage, twenty independent-source samples, and ten company pages at both release-gate viewports. Build with webpack.
- [ ] Commit with the requested message and write the controller report last. PARTIAL means no background continuation.

Tests cover quarter/holder filtering, share-class punctuation, explicit CUSIP mapping, excluded instruments, missing listings, and immutable baseline records. Existing publication eligibility and invariant tests must continue passing. No deployment, revalidation, data-repository publication, or master push is authorized.

2026-10-04 checkpoint: 1,167 additions analyzed; 1,166 staged, 2,708 baseline
dossiers unchanged. Quota ledger is at 100,000, with 119 missing fundamental
records and 109 unresolved held tickers. All 197 regression tests and webpack
production build passed. Ten pages at both required viewports passed; 226 states
have zero cut/overlap/offscreen issues, but 65 fail whitespace checks. The fixed
twenty-company source sample has twelve unresolved checks across nine companies.
This checkpoint is PARTIAL and must not ship. The controller report is written
after committing and stopping owned processes; there is no background resume.
