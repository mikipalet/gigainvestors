These are synthetic Task 12 presentation fixtures, not recorded financial data or investment conclusions.

- KO.US passes all five quality tests, has a USD 100 mid-value, evidence and a holder.
- DAL.US fails exactly the moat test and has a USD 40 mid-value.
- SPARSE.US has insufficient data and no valuation.
- The country index contains all three companies. The default index contains the two scored companies, matching the published store contract.
- prices/US.json deliberately omits KO.US to exercise the server-rendered missing-price behavior. Browser tests intercept the public raw GitHub prices request with KO at USD 60 and DAL at USD 50, giving independently known margins of safety of 40% and -25%.
- Dossier filenames use the shared FNV-1a shard function. top.json contains the two scored companies.

All value data requests in browser tests are intercepted with fixtures. No live financial API calls are needed for this task.
