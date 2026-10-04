# Paid API verification

Only use a throwaway Base Sepolia payer. Store its private key in a temporary
file with mode 0600, never `.env.local`. Set `TEST_PAYER_KEY_FILE` to that path.
The runner checks chain 84532, the canonical test USDC contract, and each exact
price before signing. Delete the temporary key after verification.

For protected Vercel previews, set `X402_TEST_VERCEL=1`. The runner uses the
existing Vercel CLI login to supply the protection-bypass header for tests.
It passes payment signatures over stdin, without printing them. This does not
make the preview publicly accessible or change deployment protection.

Pull Preview variables into a chmod-600 temporary file under the worktree and
set `X402_TEST_ENV_FILE` to its path for Blob usage verification. Sensitive
Vercel variables cannot be downloaded and will be blank. Shred/delete the
temporary file afterward; never copy CDP credentials to `.env.local`.

Run `npm run api:testnet -- https://<immutable-preview>.vercel.app`.
It pays for investor directory ($0.002), historical BRK holdings ($0.010), and
a one-row export ($0.050). For each, it checks 402 → signed request → 200,
successful onchain USDC transfer, exact payer balance deduction, and two
identical replays without additional balance loss. It then verifies one Blob
usage entry per transaction. Total test spend is 0.062 test USDC. Output contains
only receipts, amounts, response hashes and non-sensitive usage metadata.

## Credentials that stay inside Vercel

`scripts/agent-api/preview-readiness.ts` is a guarded build-time diagnostic.
It only runs when all three conditions hold: Vercel Preview environment,
branch `value-zv-api`, and `X402_TEST_PAYER_ADDRESS` set to the throwaway payer's
public address. It authenticates to CDP `/supported`, requires v2 exact Base
mainnet support, then requests Base Sepolia USDC from the official CDP faucet.
It never settles a mainnet payment or exposes an HTTP diagnostic endpoint.
Remove that branch-scoped variable immediately after funding to prevent
another faucet request on later builds. Production builds always skip it.

## Production settings

Production must use `X402_NETWORK=eip155:8453`, the owner's `X402_PAY_TO`, and
`CDP_API_KEY_ID` / `CDP_API_KEY_SECRET`. With no facilitator override, the code
selects CDP on mainnet and x402.org on Sepolia. Retain shared Redis and Blob
credentials. A future production build uses Base's real USDC contract
`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`; prices and endpoint contracts stay
the same. Payment journals separate environment, network and recipient.

Changing stored Production environment variables does not update an existing
deployment. Build the approved branch with the Production environment when
production deployment is separately authorized. Do not promote a Sepolia
preview artifact and assume its embedded environment changes.
