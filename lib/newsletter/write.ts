import type { Facts } from "./issue";

export interface Prose {
  headline: string;
  paragraphs: string[];
}

const BANNED = /\b(delve|foster|leverage|utili[sz]e|facilitate|empower|streamline|robust|cutting-edge|paradigm|game.?changer|tapestry|realm|beacon|multifaceted|meticulous|intricate|paramount|transformative|elevate|embark|supercharge|harness|ever-evolving|notabl[ey]|remarkabl[ey]|interestingly|massive|huge|significant(?:ly)?|it'?s worth noting|underscor\w*|highlight\w*|testament|pivotal)\b/i;

const STYLE = `You write the quarterly letter for GigaInvestors, a site that shows 83 famous investors' 13F portfolios as treemaps. The reader follows these investors and wants to know, in three minutes, what happened this quarter and why it is interesting.

You are handed the quarter's facts as JSON. Every number, name, ticker, date and event you write must come from them. Use each figure as given: never add, subtract or combine numbers into a new one (a position's weight is not what was bought this quarter). Do not add anything the facts do not say, do not infer motives (say "sold into a 24% rally", never "took profits"), do not predict, do not advise.

Choose. Do not cover everything. Pick the 4 to 6 threads a sharp friend would tell you about over coffee, and make each one interesting using only what the data shows: size relative to that investor's own book, who else did the same or the opposite, what the price did over the quarter, how long the position had been held, how concentrated the book is now and since when. A small move by a famous investor can beat a large move by an obscure one; a $34M bet that is 20% of someone's book is a story.

Shape: a headline of at most nine words stating one specific fact (two short sentences are fine), then 5 to 7 paragraphs of 2 to 4 sentences, 350 to 500 words in total. The first paragraph is the lead story and must stand alone. Each later paragraph is one thread. The last paragraph says who has not filed, anything left out and why, and when the next filings are due.

Vary the shape. Do not end more than one paragraph on a top-five concentration figure, and let at least one paragraph stop on a plain fact with no closing statistic at all. No two paragraphs should follow the same template.

Never write in the first person, singular or plural. There is no "we", no "our filers", no "the investors we track": say "the 83 investors" or name them. Numerals for numbers in the headline too.

Voice: plain words, short sentences, active voice, specific. Numerals for all numbers. Money as $17B, $786M, $34M. Percentages as whole numbers. Company names without Inc., Corp., Ltd or share-class suffixes, with the ticker in parentheses on first mention only; the investor's last name after the first mention. Quarter-end prices, so you may say "at quarter-end prices". No bullet points, no headings, no em dashes, no exclamation marks, no rhetorical questions, no "not X but Y" contrasts, no adjectives that grade importance (huge, notable, remarkable, significant), no closing aphorism, no summary. End on a fact.

Output JSON only: {"headline": string, "paragraphs": string[]}`;

const numberTokens = (s: string) => [...s.matchAll(/\$?\d[\d,]*(?:\.\d+)?\s?[KMBT]?%?/g)].map((m) => m[0].replace(/\s/g, ""));

function allowedNumbers(facts: Facts): { money: number[]; pct: number[]; counts: Set<number> } {
  const money: number[] = [];
  const pct: number[] = [];
  const counts = new Set<number>();
  const walk = (v: unknown, key: string) => {
    if (typeof v === "number") {
      if (/dollars|total|value|aggregate/i.test(key)) money.push(v);
      else if (/pct|change|impact|turnover/i.test(key)) pct.push(v);
      else counts.add(v);
      return;
    }
    if (typeof v === "string") {
      for (const n of v.match(/\d+/g) ?? []) counts.add(Number(n));
      return;
    }
    if (Array.isArray(v)) {
      counts.add(v.length);
      v.forEach((x) => walk(x, key));
      return;
    }
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(facts, "");
  for (const inv of facts.investors) for (const m of inv.moves) counts.add(m.othersBought.length + 1), counts.add(m.othersSold.length + 1);
  for (const c of [...facts.agreed, ...facts.contested]) counts.add(c.buyers.length + 1), counts.add(c.sellers.length + 1);
  return { money, pct, counts };
}

const parseMoney = (t: string): number | null => {
  const m = t.match(/^\$(\d[\d,]*(?:\.\d+)?)([KMBT])?$/);
  if (!m) return null;
  const mult = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 }[m[2] ?? ""] ?? 1;
  return Number(m[1].replace(/,/g, "")) * mult;
};

// Every number in the prose must trace to the facts: money within 3% (rounding), percentages
// within 1 point, plain counts exactly. Tickers must be in the facts too.
export function verifyProse(facts: Facts, prose: Prose): string[] {
  const text = [prose.headline, ...prose.paragraphs].join("\n");
  const problems: string[] = [];
  const allowed = allowedNumbers(facts);
  for (const tok of numberTokens(text)) {
    const money = parseMoney(tok);
    if (money !== null) {
      if (!allowed.money.some((v) => Math.abs(v - money) <= Math.max(money, v) * 0.03 + 1)) problems.push(`${tok} is not in the facts`);
      continue;
    }
    if (tok.endsWith("%")) {
      const p = Number(tok.slice(0, -1).replace(/,/g, ""));
      if (!allowed.pct.some((v) => Math.abs(Math.abs(v) - Math.abs(p)) <= 1)) problems.push(`${tok} is not in the facts`);
      continue;
    }
    const n = Number(tok.replace(/,/g, ""));
    if (!allowed.counts.has(n) && !allowed.money.some((v) => Math.abs(v - n) <= v * 0.03)) problems.push(`${tok} is not in the facts`);
  }
  const tickers = new Set<string>();
  for (const inv of facts.investors) for (const m of inv.moves) tickers.add(m.ticker);
  for (const c of [...facts.agreed, ...facts.contested, ...facts.crowd]) tickers.add(c.ticker);
  if (facts.lead) for (const p of facts.lead.book) tickers.add(p.ticker);
  const okWords = new Set(["US", "AI", "IPO", "ETF", "CEO", "SEC", "SPAC", "GAAP", "REIT", "ADR", "LLC", "LP"]);
  for (const t of new Set(text.match(/\b[A-Z]{2,5}\b/g) ?? [])) if (!tickers.has(t) && !okWords.has(t)) problems.push(`${t} is not a ticker in the facts`);
  const banned = text.match(BANNED);
  if (banned) problems.push(`banned word: ${banned[0]}`);
  if (/—|!|\?/.test(text)) problems.push("no em dashes, exclamation or question marks");
  const words = text.split(/\s+/).length;
  if (words < 250 || words > 600) problems.push(`${words} words; aim for 350 to 500`);
  if (prose.paragraphs.length < 4 || prose.paragraphs.length > 8) problems.push(`${prose.paragraphs.length} paragraphs; aim for 5 to 7`);
  return problems;
}

async function ask(messages: { role: "user" | "assistant"; content: string }[]): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.NEWSLETTER_MODEL ?? "claude-fable-5", max_tokens: 12000, system: STYLE, messages }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { stop_reason: string; content: { type: string; text?: string }[] };
  if (data.stop_reason === "max_tokens") throw new Error("model output truncated");
  return data.content.find((c) => c.type === "text")?.text ?? "";
}

const parse = (raw: string): Prose => {
  const json = raw.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error(`no JSON in model output: ${raw.slice(0, 200)}`);
  const p = JSON.parse(json) as Partial<Prose>;
  if (typeof p.headline !== "string" || !Array.isArray(p.paragraphs)) throw new Error("model output is not {headline, paragraphs}");
  return { headline: p.headline.trim(), paragraphs: p.paragraphs.map((s) => String(s).trim()).filter(Boolean) };
};

// Writes the issue from the facts and refuses anything the verifier cannot trace back to them.
export async function composeProse(facts: Facts): Promise<Prose> {
  const messages: { role: "user" | "assistant"; content: string }[] = [{ role: "user", content: `Facts for ${facts.quarter}:\n${JSON.stringify(facts)}` }];
  let last: string[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = await ask(messages);
    const prose = parse(raw);
    last = verifyProse(facts, prose);
    if (!last.length) return prose;
    messages.push({ role: "assistant", content: raw }, { role: "user", content: `Fix these and return the full JSON again:\n- ${last.join("\n- ")}` });
  }
  throw new Error(`prose failed verification after 3 attempts:\n- ${last.join("\n- ")}`);
}
