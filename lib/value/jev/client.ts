import { z } from "zod";
import { appendJsonl, corpusDir, readJsonl } from "../corpus";
import { createLimiter, fetchWithRetry } from "../http";
import type { JevQuestion, RawAnswer } from "../types";

export type { JevQuestion, RawAnswer } from "../types";
const limit = createLimiter({ perSecond: 18 });
const tokenLimit = createLimiter({ perSecond: 250_000 / 32_000 });
const probability = z.number().min(0).max(1);
const distribution = z.record(z.string(), probability);
const responseSchema = z.object({
  answers: z.record(z.string(), z.discriminatedUnion("type", [
    z.object({ type: z.literal("noul"), noul: probability }),
    z.object({ type: z.literal("choice"), choice: z.string(), probabilities: distribution, confidence: probability }),
    z.object({ type: z.literal("score"), score: z.number().finite(), probabilities: distribution, legend: z.record(z.string(), z.string()), confidence: probability }),
  ])),
  usage: z.object({ input_tokens: z.number().int().nonnegative() }),
});
const totals = new Map<string, number>();
/** Budget for one HTTP exchange. It starts when the request is sent, not when it is queued. */
export const JEV_REQUEST_TIMEOUT_MS = 120_000;

export async function askJev({ state, questions, usageFile = "jev-usage.jsonl" }: {
  state: string;
  usageFile?: string;
  questions: Record<string, JevQuestion>;
}): Promise<{ answers: Record<string, RawAnswer>; usage: { input_tokens: number } }> {
  const key = process.env.JEV_API_KEY;
  if (!key) throw new Error("JEV_API_KEY is required");
  const body = JSON.stringify({ model: "jev-latest", state, questions });
  if (Buffer.byteLength(body) > 32_000) throw new Error("Jev request exceeds conservative context budget");
  // Each attempt, retries included, waits for its rate slot and then gets its
  // own timeout; a timed-out attempt is retried like a 5xx instead of failing
  // the company (retries used to share one budget and skip the rate limits).
  const response = await fetchWithRetry("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body,
    retryOn: [429, 529, 520, 502, 503, 504],
    retryNetworkErrors: true,
    beforeAttempt: () => tokenLimit(() => limit(async () => {})),
    fetcher: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(JEV_REQUEST_TIMEOUT_MS) }),
  });
  if (!response.ok) throw new Error(`Jev HTTP ${response.status}`);
  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Invalid Jev response");
  const result = parsed.data;
  for (const [id, q] of Object.entries(questions)) {
    const answer = result.answers[id];
    if (!answer || answer.type !== q.type) throw new Error("Invalid Jev response");
    if (answer.type === "choice" && q.type === "choice" && (
      !(answer.choice in q.criteria) || Object.keys(q.criteria).some((option) => answer.probabilities[option] === undefined)
    )) throw new Error("Invalid Jev response");
    if (answer.type === "score" && q.type === "score" && (
      answer.score < 0 || answer.score > q.criteria.length - 1
    )) throw new Error("Invalid Jev response");
  }
  const root = corpusDir();
  const totalKey = `${root}/${usageFile}`;
  const previous = totals.get(totalKey) ?? readJsonl<{ input_tokens: number }>(usageFile)
    .reduce((sum, row) => sum + row.input_tokens, 0);
  const cumulative = previous + result.usage.input_tokens;
  appendJsonl(usageFile, { at: new Date().toISOString(), input_tokens: result.usage.input_tokens, cumulative_input_tokens: cumulative });
  totals.set(totalKey, cumulative);
  return result;
}
