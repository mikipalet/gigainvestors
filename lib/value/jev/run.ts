import { createHash } from "node:crypto";
import { T } from "../config";
import { readCorpusJson, writeCorpusJson } from "../corpus";
import trust from "../jev-trust.json";
import type { Id, JevAnswer, JevQuestion, RawAnswer, SectionKey } from "../types";
import { askJev } from "./client";
import { QUESTIONS, QUESTIONS_VERSION } from "./questions";

type Section = SectionKey | "description";
type Sample = { raw: RawAnswer; weight: number; section: Section };
type Cached = { version: string; hash: string; answers: JevAnswer[] };
const trusted = () => new Set(QUESTIONS.filter(question => trust.trusted.includes(question.id)
  && (trust.versions as Record<string, string>)[question.id] === question.version).map(question => question.id));

function chunks(text: string): string[] {
  const result: string[] = [];
  let chunk = "";
  let bytes = 0;
  for (const character of text) {
    const size = Buffer.byteLength(character);
    if (bytes + size > T.jev.chunkTokens) {
      result.push(chunk);
      chunk = "";
      bytes = 0;
    }
    chunk += character;
    bytes += size;
  }
  if (chunk) result.push(chunk);
  return result;
}

function aggregate(question: (typeof QUESTIONS)[number], samples: Sample[]): JevAnswer {
  const base: JevAnswer = {
    q: question.id, label: question.label, kind: question.q.type,
    value: null, probability: null, section: question.sections[0], evidence: null,
    trusted: trusted().has(question.id),
  };
  if (!samples.length) return base;
  if (question.mode === "any") {
    const best = samples.reduce((a, b) =>
      b.raw.type === "noul" && a.raw.type === "noul" && b.raw.noul > a.raw.noul ? b : a);
    if (best.raw.type !== "noul") throw new Error("Presence questions must be noul");
    return { ...base, value: best.raw.noul, probability: best.raw.noul, section: best.section };
  }
  const weight = samples.reduce((sum, sample) => sum + sample.weight, 0);
  const section = samples.reduce((a, b) => b.weight > a.weight ? b : a).section;
  if (question.q.type === "choice") {
    const probabilities = Object.fromEntries(Object.keys(question.q.criteria).map((key) => [key, 0]));
    for (const sample of samples) {
      if (sample.raw.type !== "choice") throw new Error("Mismatched Jev answer");
      for (const key of Object.keys(probabilities)) probabilities[key] += (sample.raw.probabilities[key] ?? 0) * sample.weight / weight;
    }
    const [value, probability] = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0];
    return { ...base, value, probability, section };
  }
  let value = 0;
  let probability = 0;
  for (const sample of samples) {
    if (sample.raw.type === "choice") throw new Error("Mismatched Jev answer");
    value += (sample.raw.type === "noul" ? sample.raw.noul : sample.raw.score) * sample.weight / weight;
    probability += (sample.raw.type === "noul" ? sample.raw.noul : sample.raw.confidence) * sample.weight / weight;
  }
  return { ...base, value, probability, section };
}

export async function askCompany({ id, sections }: {
  id: Id;
  sections: Partial<Record<Section, string>>;
}): Promise<JevAnswer[]> {
  const entries = Object.entries(sections).filter((entry): entry is [Section, string] => Boolean(entry[1]?.trim()))
    .sort(([a], [b]) => a.localeCompare(b));
  const hash = createHash("sha256").update(JSON.stringify(entries)).digest("hex");
  const file = `jev/${encodeURIComponent(id)}.json`;
  const cached = readCorpusJson<Cached>(file);
  if (cached?.version === QUESTIONS_VERSION && cached.hash === hash) {
    return cached.answers.map((answer) => ({ ...answer, trusted: trusted().has(answer.q) }));
  }
  const samples = new Map<string, Sample[]>();
  const results = await Promise.all(entries.flatMap(([section, text]) => {
    const bound = QUESTIONS.filter((question) => question.sections.includes(section));
    if (!bound.length) return [];
    const questions = Object.fromEntries(bound.map((question) => [question.id, question.q]));
    return chunks(text).map(async (state) => ({ section, weight: state.length, ...(await askJev({ state, questions })) }));
  }));
  for (const result of results) {
    for (const [id, raw] of Object.entries(result.answers)) {
      const values = samples.get(id) ?? [];
      values.push({ raw, section: result.section, weight: result.weight });
      samples.set(id, values);
    }
  }
  const answers = QUESTIONS.map((question) => aggregate(question, samples.get(question.id) ?? []));
  writeCorpusJson(file, { version: QUESTIONS_VERSION, hash, answers } satisfies Cached);
  return answers;
}

export async function findEvidence({ section, question }: {
  section: string;
  question: JevQuestion;
}): Promise<string | null> {
  if (question.type !== "noul") throw new Error("Evidence questions must be noul");
  const paragraphs = section.split(/\r?\n\s*\r?\n/).map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length >= T.jev.minParagraphChars);
  const scored = await Promise.all(paragraphs.map(async (paragraph) => {
    const results = await Promise.all(chunks(paragraph).map((state) => askJev({ state, questions: { evidence: question } })));
    const probability = Math.max(...results.map(({ answers }) => answers.evidence.type === "noul" ? answers.evidence.noul : 0));
    return { paragraph, probability };
  }));
  const best = scored.sort((a, b) => b.probability - a.probability)[0];
  return best && best.probability >= T.jev.evidence ? best.paragraph : null;
}
