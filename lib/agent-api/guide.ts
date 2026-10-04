export const AGENT_GUIDE = `# GigaInvestors agent API

Use /api/v1/openapi.json for every endpoint and schema, /api/v1/pricing for current prices, and /.well-known/x402 for discovery. These and this guide are free. Versioned responses have { apiVersion: "v1", data: ... }.

No accounts, API keys or subscriptions. Paid requests use x402 v2, exact USDC: $0.002 for search/list/verdict/method/forward, $0.01 for dossiers/memos/price stories/investor holdings, $0.05 for quarterly history and bulk export. Each page is a call.

1. GET a paid endpoint, for example /api/v1/companies/KO.US/verdict.
2. Decode the base64 PAYMENT-REQUIRED header on HTTP 402. Check network, asset, amount and recipient against your budget and trusted destination.
3. Sign the USDC EIP-3009 authorization with your own payer. Send the x402 payload in PAYMENT-SIGNATURE to the same complete URL.
4. On HTTP 200, decode PAYMENT-RESPONSE for the transaction receipt. The server settles only after preparing valid data. Invalid input or unavailable data does not incur a new payment.

Preview defaults to Base Sepolia (eip155:84532); mainnet is Base (eip155:8453). A 503 payments_unconfigured means the owner has not configured a receiving address. Do not send funds to an address guessed from an example.

## TypeScript client

Install @x402/fetch, @x402/evm, @x402/extensions and viem. The signer belongs to the buyer, never to this API. Supply an existing wallet signer; do not create a receiving private key on the server.

\`\`\`ts
import { x402Client, wrapFetchWithPayment } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { generatePaymentId, appendPaymentIdentifierToExtensions } from '@x402/extensions/payment-identifier';

const client = new x402Client().register('eip155:84532', new ExactEvmScheme(payerSigner));
const paymentId = generatePaymentId(); // one per logical request
client.onBeforePaymentCreation(async ({ paymentRequired }) => {
  if (paymentRequired.extensions)
    appendPaymentIdentifierToExtensions(paymentRequired.extensions, paymentId);
});
let signedHeaders: Headers | undefined;
const transport: typeof fetch = async (input, init) => {
  const request = new Request(input, init);
  if (request.headers.has('PAYMENT-SIGNATURE')) signedHeaders = new Headers(request.headers);
  return fetch(request);
};
const paidFetch = wrapFetchWithPayment(transport, client);
const url = origin + '/api/v1/companies/KO.US/verdict';
const response = await paidFetch(url);
if (!response.ok) throw new Error('API status ' + response.status);
const research = await response.json();
// If the paid response was lost, retry the ORIGINAL signed headers:
// await fetch(url, { headers: signedHeaders });
\`\`\`

## Retry and caching contract

Persist the original PAYMENT-SIGNATURE and complete URL securely until the call succeeds. Repeating that request returns the saved body and receipt without another settlement. The optional payment-identifier extension binds an ID to the original signed payload and resource. Reusing the ID with a different payload or URL returns 409; creating another signature is not a safe retry. Concurrent requests may return 409 payment_pending; retry the same signed request. A settlement timeout remains blocked for operator reconciliation rather than initiating another charge.

Paid responses have ETag plus Cache-Control: private, no-store, preventing a CDN from bypassing payment. If-None-Match is not an authorization credential and does not grant free access. Free JSON documents support conditional GET/304. Unsupported query parameters and duplicate parameters are rejected before payment.

## Data and identifiers

Company IDs follow the site's listing identifiers (KO.US, ASML.AS). Investor IDs follow /investors (BRK). quarter is YYYYQ1–YYYYQ4. /time-travel lists published quarters; unavailable quarters return 404. Use limit/offset and nextOffset for list pagination; export permits 10000 rows. markets=western is the checklist default; markets=all widens coverage. list=buy-now, next-closest or all selects the checklist. country, sector, tags, held, quality tests and funnel gates mirror site filters.

Dossiers expose our verdict, five tests and reasons, computed metrics and allowlisted series, valuation, memo, price story and business analysis. Raw price/fundamental series and raw Dataroma tables are excluded. Holdings expose derived ranks, normalized weights, changes and concentration, without share counts or position dollar values. Price stories omit raw money charts. Series of computed ratios or owner earnings are included. Time-travel is a hindsight simulation; preserve its caveats and return denominators. Forward records use dated observations. Research is not investment advice.
`;
