import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { askJev } from "@/lib/value/jev/client";
import { askCompany, findEvidence } from "@/lib/value/jev/run";
import { combine } from "@/lib/value/jev/combine";
import type { JevAnswer, JevQuestion, RawAnswer } from "@/lib/value/types";

vi.mock("@/lib/value/jev/client", () => ({ askJev: vi.fn() }));
const ask = vi.mocked(askJev);
let directory: string;

function response(questions: Record<string, JevQuestion>, probability: number) {
  const answers: Record<string, RawAnswer> = {};
  for (const [id, q] of Object.entries(questions)) {
    if (q.type === "noul") answers[id] = { type: "noul", noul: probability };
    if (q.type === "score") answers[id] = { type: "score", score: probability * 2, confidence: 0.8, probabilities: { "0": 1 - probability, "2": probability }, legend: { "0": "Low", "1": "Medium", "2": "High" } };
    if (q.type === "choice") {
      const options = Object.keys(q.criteria);
      answers[id] = { type: "choice", choice: options[0], confidence: 0.8, probabilities: Object.fromEntries(options.map((key, index) => [key, index === 0 ? probability : (1 - probability) / (options.length - 1)])) };
    }
  }
  return { answers, usage: { input_tokens: 10 } };
}

beforeEach(() => {
  directory = mkdtempSync(path.resolve("tests/fixtures/value/jev/.runtime-"));
  vi.stubEnv("VALUE_CORPUS_DIR", directory);
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden in tests"); }));
  ask.mockReset();
  ask.mockImplementation(async ({ questions }) => response(questions, 0.8));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  rmSync(directory, { recursive: true, force: true });
});

describe("company questions", () => {
  it("takes the maximum for presence questions across three chunks", async () => {
    const probabilities = [0.2, 0.9, 0.4];
    ask.mockImplementation(async ({ questions }) => response(questions, probabilities.shift()!));
    const answers = await askCompany({ id: "KO.US", sections: { business: "a".repeat(60_000) } });
    expect(answers.find((a) => a.q === "brand")).toMatchObject({ value: 0.9, probability: 0.9 });
  });

  it("weights mean answers by chunk length", async () => {
    const probabilities = [0.2, 0.8];
    ask.mockImplementation(async ({ questions }) => response(questions, probabilities.shift()!));
    const answers = await askCompany({ id: "KO.US", sections: { business: "a".repeat(36_000) } });
    expect(answers.find((a) => a.q === "same_10y")?.value).toBeCloseTo(0.4);
    expect(answers.find((a) => a.q === "technology_change")?.value).toBeCloseTo(0.8);
  });

  it("leaves missing letter questions null", async () => {
    const answers = await askCompany({ id: "KO.US", sections: { description: "Sells drinks." } });
    expect(answers.find((a) => a.q === "admits_mistakes")).toMatchObject({ value: null, probability: null, section: "letter" });
  });

  it("sends all bound questions in one request per section chunk", async () => {
    await askCompany({ id: "KO.US", sections: { business: "a".repeat(36_000), letter: "We made a mistake." } });
    expect(ask).toHaveBeenCalledTimes(3);
    const business = ask.mock.calls.filter(([input]) => input.state.startsWith("a"));
    expect(business).toHaveLength(2);
    expect(Object.keys(business[0][0].questions)).toContain("brand");
    expect(Object.keys(business[0][0].questions)).toContain("revenue_model");
  });

  it("caches by version and content independent of section order", async () => {
    const sections = { business: "Drinks", letter: "A letter" };
    const first = await askCompany({ id: "KO.US", sections });
    expect(await askCompany({ id: "KO.US", sections: { letter: sections.letter, business: sections.business } })).toEqual(first);
    expect(ask).toHaveBeenCalledTimes(2);
    await askCompany({ id: "KO.US", sections: { business: "Different" } });
    expect(ask).toHaveBeenCalledTimes(3);
  });

  it("invalidates old question versions and refreshes trust on cache hits", async () => {
    const input = { id: "KO.US", sections: { business: "Drinks" } };
    const answers = await askCompany(input);
    expect(answers.filter(answer => answer.trusted).map(answer => answer.q).sort()).toEqual(["brand", "capex_purpose", "compensation_basis", "revenue_model", "same_10y"]);
    expect(answers.find(answer => answer.q === "commodity_product")?.trusted).toBe(false);
    const file = path.join(directory, "jev/KO.US.json");
    const cache = JSON.parse(readFileSync(file, "utf8"));
    cache.answers.forEach((answer: JevAnswer) => { answer.trusted = true; });
    writeFileSync(file, JSON.stringify(cache));
    expect((await askCompany(input)).map(answer => answer.trusted)).toEqual(answers.map(answer => answer.trusted));
    expect(ask).toHaveBeenCalledTimes(1);
    cache.version = "old";
    writeFileSync(file, JSON.stringify(cache));
    await askCompany(input);
    expect(ask).toHaveBeenCalledTimes(2);
  });

  it("aggregates choice distributions before selecting the winner", async () => {
    ask.mockImplementation(async ({ questions, state }) => {
      const result = response(questions, 0.8);
      result.answers.revenue_model = { type: "choice", choice: state.length === 24_000 ? "recurring" : "repeat_consumable", confidence: 0.8, probabilities: { recurring: state.length === 24_000 ? 0.6 : 0, repeat_consumable: state.length === 24_000 ? 0.4 : 1, transactional: 0, project: 0, commodity: 0 } };
      return result;
    });
    const answers = await askCompany({ id: "KO.US", sections: { business: "a".repeat(36_000) } });
    expect(answers.find((a) => a.q === "revenue_model")).toMatchObject({ value: "repeat_consumable" });
    expect(answers.find((a) => a.q === "revenue_model")?.probability).toBeCloseTo(0.6);
  });

  it("fits escaped report text inside the serialized Jev request budget without losing text", async () => {
    const text = '\n"\\\u0000日本😀'.repeat(5000);
    ask.mockImplementation(async ({ state, questions }) => {
      if (Buffer.byteLength(JSON.stringify({ model: "jev-latest", state, questions })) > 32_000) {
        throw new Error("Jev request exceeds conservative context budget");
      }
      return response(questions, 0.8);
    });
    const answers = await askCompany({ id: "ESCAPED.US", sections: { business: text } });
    expect(answers.find(a => a.q === "brand")?.value).toBe(0.8);
    expect(ask.mock.calls.map(([input]) => input.state).join("")).toBe(text);
  });

  it("preserves Unicode while keeping chunks within a conservative token bound", async () => {
    const text = "日本😀".repeat(5000);
    await askCompany({ id: "8058.JP", sections: { business: text } });
    const chunks = ask.mock.calls.map(([input]) => input.state);
    expect(chunks.join("")).toBe(text);
    expect(chunks.every((chunk) => Buffer.byteLength(chunk) <= 24_000)).toBe(true);
  });
});

function answer(overrides: Partial<JevAnswer> = {}): JevAnswer {
  return { q: "commodity", label: "Commodity dependent", kind: "noul", value: 0.8, probability: 0.8, section: "business", evidence: null, trusted: true, ...overrides };
}

describe("combine", () => {
  it("downgrades a trusted contradiction", () => {
    expect(combine({ numeric: "pass", jev: [answer()] })).toBe("unclear");
  });
  it("ignores untrusted contradictions", () => {
    expect(combine({ numeric: "pass", jev: [answer({ value: 0.9, probability: 0.9, trusted: false })] })).toBe("pass");
  });
  it.each(["fail", "unclear", "na"] as const)("preserves numeric %s", (numeric) => {
    expect(combine({ numeric, jev: [answer()] })).toBe(numeric);
  });
  it("inverts a no contradiction and uses the inclusive threshold", () => {
    expect(combine({ numeric: "pass", jev: [answer({ q: "same_10y", value: 0.2, probability: 0.2 })] })).toBe("unclear");
    expect(combine({ numeric: "pass", jev: [answer({ value: 0.7, probability: 0.7 })] })).toBe("unclear");
    expect(combine({ numeric: "pass", jev: [answer({ value: 0.69, probability: 0.69 })] })).toBe("pass");
  });
  it("does not treat supportive, unknown or missing answers as contradictions", () => {
    expect(combine({ numeric: "pass", jev: [answer({ q: "brand" }), answer({ q: "unknown" }), answer({ value: null, probability: null })] })).toBe("pass");
  });
});

describe("evidence", () => {
  const question: JevQuestion = { type: "noul", instructions: "Does the letter admit a mistake?" };
  it("returns the strongest sufficiently long paragraph", async () => {
    ask.mockImplementation(async ({ questions, state }) => response(questions, state.startsWith("B") ? 0.9 : 0.3));
    expect(await findEvidence({ section: `Short.\n\n${"A".repeat(220)}\n\n${"B".repeat(240)}`, question })).toBe("B".repeat(240));
    expect(ask).toHaveBeenCalledTimes(2);
  });
  it("returns null below the evidence threshold or without long paragraphs", async () => {
    ask.mockImplementation(async ({ questions }) => response(questions, 0.59));
    expect(await findEvidence({ section: "A".repeat(220), question })).toBeNull();
    expect(await findEvidence({ section: "Short", question })).toBeNull();
  });
});

describe("HTTP client", () => {
  async function client() {
    return vi.importActual<typeof import("@/lib/value/jev/client")>("@/lib/value/jev/client");
  }
  it("replays the recorded response, retries 429 and 529, and persists cumulative usage", async () => {
    const fixture = JSON.parse(readFileSync(path.resolve("tests/fixtures/value/jev/ko-business.json"), "utf8"));
    vi.stubEnv("JEV_API_KEY", "test-secret");
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 429, headers: { "Retry-After": "0" } }))
      .mockResolvedValueOnce(new Response(null, { status: 529, headers: { "Retry-After": "0" } }))
      .mockImplementation(async () => Response.json(fixture.response));
    vi.stubGlobal("fetch", fetcher);
    const { askJev: realAsk } = await client();
    expect(await realAsk(fixture.request)).toMatchObject({ answers: { revenue_model: { choice: "repeat_consumable" } } });
    await realAsk(fixture.request);
    expect(fetcher).toHaveBeenCalledTimes(4);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.typesafe.ai/v1/systemone");
    expect(JSON.parse(init.body)).toEqual(fixture.request);
    expect(init.headers.Authorization).toBe("Bearer test-secret");
    const usage = readFileSync(path.join(directory, "jev-usage.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
    expect(usage[1].cumulative_input_tokens).toBe(fixture.response.usage.input_tokens * 2);
    expect(JSON.stringify(usage)).not.toContain("test-secret");
  });
  it.each([520, 502, 503, 504])('retries Cloudflare origin error %s', async status => {
    const fixture = JSON.parse(readFileSync(path.resolve("tests/fixtures/value/jev/ko-business.json"), "utf8"));
    vi.stubEnv('JEV_API_KEY', 'fixture');
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(null, { status, headers: { 'Retry-After': '0' } }))
      .mockImplementation(async () => Response.json(fixture.response));
    vi.stubGlobal('fetch', fetcher);
    const { askJev: realAsk } = await client();
    expect(await realAsk(fixture.request)).toMatchObject({ answers: fixture.response.answers });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("fails without a key and never exposes API error bodies", async () => {
    const { askJev: realAsk } = await client();
    const input = { state: "Hello", questions: { q: { type: "noul" as const, instructions: "Is this a greeting?" } } };
    vi.stubEnv("JEV_API_KEY", "");
    await expect(realAsk(input)).rejects.toThrow("JEV_API_KEY");
    vi.stubEnv("JEV_API_KEY", "test-secret");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("test-secret", { status: 401 })));
    await expect(realAsk(input)).rejects.toThrow("Jev HTTP 401");
  });
  it("rejects missing or malformed answers rather than caching false certainty", async () => {
    const { askJev: realAsk } = await client();
    vi.stubEnv("JEV_API_KEY", "test-secret");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ answers: { q: { type: "noul", noul: 2 } }, usage: { input_tokens: 1 } })));
    await expect(realAsk({ state: "Hello", questions: { q: { type: "noul", instructions: "Greeting?" } } })).rejects.toThrow("Invalid Jev response");
  });
});

it("C8 considers founder ownership stated in any report section", async () => {
  ask.mockImplementation(async ({ questions, state }) => response(questions, state.includes("founder") ? 0.95 : 0.1));
  const answers = await askCompany({ id: "TEST.US", sections: { business: "Widgets", notes: "The founder chairs the board and is a major shareholder." } });
  expect(answers.find(answer => answer.q === "founder_led")).toMatchObject({ value: 0.95, section: "notes", trusted: false });
});

it('batches all evidence questions into at most forty longest paragraph requests', async () => {
  const question: JevQuestion = { type: 'noul', instructions: 'Evidence?' };
  const paragraphs = Array.from({ length: 100 }, (_, i) => `${i}:` + 'A'.repeat(200 + i));
  const result = await findEvidence({ section: paragraphs.join('\n\n'), questions: { brand: question, network: question } });
  expect(ask).toHaveBeenCalledTimes(40);
  expect(ask.mock.calls.every(([args]) => Object.keys(args.questions).length === 2 && Number(args.state.split(':')[0]) >= 60)).toBe(true);
  expect(result).toEqual({ brand: paragraphs[99], network: paragraphs[99] });
});
