import type { SectionKey } from "../types";

export const SECTION_TOKENS: Record<SectionKey, number> = {
  business: 8000, mdna: 6000, letter: 6000, compensation: 4000,
  notes: 4000, capital: 3000, risk: 3000, auditor: 2000,
};

export function truncateTokens(text: string, maxTokens: number): string {
  if (!Number.isFinite(maxTokens) || maxTokens < 0) throw new RangeError("maxTokens must be nonnegative and finite");
  const cjk = text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu)?.length ?? 0;
  const limit = Math.floor(maxTokens * (cjk > text.replace(/\s/g, "").length / 2 ? 1 : 4));
  if (text.length <= limit) return text;
  const prefix = text.slice(0, limit);
  const boundary = prefix.lastIndexOf("\n\n");
  return boundary >= 0 ? prefix.slice(0, boundary + 2) : prefix;
}

function lastBlock({ text, start, end, minimum = 500, last = true }: {
  text: string; start: RegExp; end: RegExp; minimum?: number; last?: boolean;
}): string | undefined {
  const starts = [...text.matchAll(new RegExp(start.source, "gim"))];
  const ends = [...text.matchAll(new RegExp(end.source, "gim"))].map((match) => match.index);
  const ordered = last ? starts.reverse() : starts;
  // Prefer a real heading pair before considering an unterminated section.
  for (const allowEof of [false, true]) {
    for (const match of ordered) {
      const stop = ends.find((index) => index > match.index + match[0].length);
      if (stop === undefined && !allowEof) continue;
      const block = text.slice(match.index, stop ?? text.length).trim();
      if (block.length >= minimum) return block;
    }
  }
}

const item = (number: string) => new RegExp(`^\\s*Item\\s*${number}(?=[.\\s:])`, "im");
const anyItem = /^\s*Item\s*\d+[A-Z]?(?=[.\s:])/im;

export function cutSections({ text, form }: {
  text: string; form: "10-K" | "20-F" | "40-F" | "17-A" | "DEF 14A";
}): Partial<Record<SectionKey, string>> {
  const sections: Partial<Record<SectionKey, string>> = {};
  const add = ({ key, start, end }: { key: SectionKey; start: RegExp; end: RegExp }) => {
    const block = lastBlock({ text, start, end });
    if (block) sections[key] = truncateTokens(block, SECTION_TOKENS[key]);
  };
  if (form === "17-A") {
    add({ key: "business", start: item("1"), end: item("2") });
    add({ key: "mdna", start: item("6"), end: item("7") });
    add({ key: "capital", start: item("5"), end: item("6") });
    add({ key: "compensation", start: item("10"), end: item("11") });
  } else if (form === "10-K") {
    add({ key: "business", start: item("1"), end: item("1A") });
    add({ key: "risk", start: item("1A"), end: item("(?:1B|2)") });
    add({ key: "mdna", start: item("7"), end: item("(?:7A|8)") });
    add({ key: "capital", start: item("5"), end: item("(?:6|7)") });
  } else if (form === "20-F") {
    add({ key: "business", start: item("4"), end: item("(?:4A|5)") });
    add({ key: "risk", start: item("3[.\\s]*D"), end: item("4") });
    add({ key: "mdna", start: item("5"), end: item("6") });
    add({ key: "compensation", start: item("6[.\\s]*B"), end: item("(?:6[.\\s]*[C-G]|7)") });
    add({ key: "capital", start: item("16[.\\s]*E"), end: item("16[.\\s]*[F-K]") });
    for (const entry of [
      { key: "risk", number: "3", next: "4", heading: /^\s*(?:D[.\s]+)?Risk Factors\s*$/im, end: /$(?![\s\S])/ },
      { key: "compensation", number: "6", next: "7", heading: /^\s*(?:B[.\s]+)?Compensation\s*$/im, end: /^\s*(?:C[.\s]+)?Board Practices\s*$/im },
    ] as const) {
      if (sections[entry.key]) continue;
      const parent = lastBlock({ text, start: item(entry.number), end: item(entry.next) });
      const block = parent && lastBlock({ text: parent, start: entry.heading, end: entry.end, last: false });
      if (block) sections[entry.key] = truncateTokens(block, SECTION_TOKENS[entry.key]);
    }
  } else if (form === "DEF 14A") {
    add({ key: "compensation", start: /^\s*Compensation Discussion and Analysis\s*$/im,
      end: /^\s*(?:Compensation Committee Report|Summary Compensation Table|Executive Compensation Tables)\s*$/im });
  } else if (text.trim()) {
    sections.business = truncateTokens(text.trim(), SECTION_TOKENS.business);
  }
  if (form !== "DEF 14A") {
    const financialText = form === "10-K"
      ? lastBlock({ text, start: item("8"), end: item("9") }) ?? text : text;
    const notes = lastBlock({ text: financialText, start: /^\s*Notes to (?:the )?(?:Consolidated )?Financial Statements\s*$/im, end: anyItem });
    if (notes) sections.notes = truncateTokens(notes, SECTION_TOKENS.notes);
    const auditor = lastBlock({ text: financialText, start: /^\s*Report of Independent Registered Public Accounting Firm\s*$/im,
      end: /^(?:\s*Item\s*\d+|\s*(?:Notes to|Consolidated (?:Balance|Statements)))/im });
    if (auditor) sections.auditor = truncateTokens(auditor.split(/\n\n+/).reduce<string[]>((paragraphs, paragraph) => {
      const remaining = 3000 - paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
      if (remaining > 0) paragraphs.push(paragraph.split(/\s+/).slice(0, remaining).join(" "));
      return paragraphs;
    }, []).join("\n\n"), SECTION_TOKENS.auditor);
  }
  return sections;
}

/** Skip cover/contents entries before using filing prose as a business fallback. */
export function filingBusinessFallback(text: string): string {
  const headings = [...text.matchAll(/^\s*Item\s*\d+[A-Z]?(?=[.\s:])[^\n]*/gim)];
  for (let index = 0; index < headings.length; index++) {
    const heading = headings[index];
    const start = heading.index + heading[0].length;
    const body = text.slice(start, headings[index + 1]?.index ?? text.length).trim();
    if (body.length >= 500) return truncateTokens(text.slice(start).trim(), SECTION_TOKENS.business);
  }
  return truncateTokens(text.slice(2000).trim(), SECTION_TOKENS.business);
}
