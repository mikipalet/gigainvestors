import { fetchWithRetry } from "../http";
import type { SectionKey } from "../types";
import { SECTION_TOKENS, truncateTokens } from "./cut-sections";

export async function latestEsef(lei: string): Promise<{ url: string; filed: string; period: string } | null> {
  const query = new URLSearchParams({ "filter[entity.identifier]": lei, sort: "-period_end", "page[size]": "1" });
  const response = await fetchWithRetry(`https://filings.xbrl.org/api/filings?${query}`);
  if (!response.ok) throw new Error(`ESEF request failed (${response.status})`);
  const data = await response.json() as {
    data: { attributes: { report_url: string; date_added: string; period_end: string } }[];
  };
  const attributes = data.data[0]?.attributes;
  if (!attributes) return null;
  if (!attributes.report_url || !attributes.date_added || !attributes.period_end) throw new Error("Incomplete ESEF filing metadata");
  return {
    url: new URL(attributes.report_url, "https://filings.xbrl.org").href,
    filed: attributes.date_added.slice(0, 10), period: attributes.period_end,
  };
}

const headings: Partial<Record<SectionKey, RegExp>> = {
  letter: /^(?:(?:letter|message) (?:from|of) the (?:ceo|chair(?:man)?|chief executive|president)|lettre aux actionnaires|brief an die aktionäre|carta del presidente)$/i,
  business: /^(?:business (?:model|overview)|our business(?: model| strategy)?|(?:our )?strategy|activités|geschäftsmodell)$/i,
  risk: /^(?:risks? (?:factors|management)(?: framework| governance structure| process| and internal control)?|principal risks|facteurs de risques|risikobericht)$/i,
  mdna: /^(?:(?:financial|operating) review|management report|rapport de gestion|lagebericht)$/i,
  compensation: /^(?:remuneration (?:report|policy)|(?:board of management|supervisory board) remuneration|rémunération|vergütungsbericht)$/i,
  notes: /^(?:notes to the (?:consolidated )?financial statements|notes aux états financiers|anhang)$/i,
  auditor: /^(?:independent auditor(?:[’']s? report)?|rapport des commissaires aux comptes|bestätigungsvermerk)$/i,
};

function navigationPositions(paragraphs: RegExpMatchArray[]): Set<number> {
  const groups = new Map<string, number[]>();
  for (let index = 0; index < paragraphs.length - 2; index++) {
    const lines = paragraphs.slice(index, index + 3).map((paragraph) => paragraph[0].trim());
    if (lines.some((line) => line.length > 80 || /[.!?]$/.test(line) || /^\d+$/.test(line))) continue;
    const key = lines.join("\n");
    groups.set(key, [...(groups.get(key) ?? []), index]);
  }
  const positions = new Set<number>();
  for (const occurrences of groups.values()) {
    if (occurrences.length < 3) continue;
    for (const index of occurrences) {
      for (let offset = 0; offset < 3; offset++) positions.add(index + offset);
    }
  }
  return positions;
}

export function cutEsefSections(text: string): Partial<Record<SectionKey, string>> {
  const paragraphs = [...text.matchAll(/[^\n]+(?:\n(?!\n)[^\n]+)*/g)];
  const navigation = navigationPositions(paragraphs);
  const matches: { key: SectionKey; index: number; navigation: boolean; contents: boolean }[] = [];
  let end = text.length;
  for (let index = 0; index < paragraphs.length; index++) {
    const paragraph = paragraphs[index];
    const heading = paragraph[0].trim().replace(/\s+/g, " ")
      .replace(/^\d+[.)]?\s+/, "").replace(/\s*\(continued\)$/i, "");
    if (/^(?:definitions|glossary)$/i.test(heading)
      && /^(?:Name|Term)\s+(?:Description|Definition)$/i.test(paragraphs.slice(index + 1, index + 3).map((part) => part[0].trim()).join(" "))) {
      end = paragraph.index;
      break;
    }
    for (const [key, pattern] of Object.entries(headings)) {
      if (pattern.test(heading)) {
        matches.push({ key: key as SectionKey, index: paragraph.index, navigation: navigation.has(index),
          contents: /^\d+$/.test(paragraphs[index + 1]?.[0].trim() ?? "") });
        break;
      }
    }
  }
  if (new Set(matches.filter((match) => !match.navigation && !match.contents).map(({ key }) => key)).size < 2) {
    return { business: truncateTokens(text, SECTION_TOKENS.business) };
  }
  const sections: Partial<Record<SectionKey, string>> = {};
  for (let index = 0; index < matches.length; index++) {
    const match = matches[index];
    if (match.navigation || match.contents) continue;
    const block = text.slice(match.index, matches[index + 1]?.index ?? end).trim();
    const previous = sections[match.key];
    if (!previous || (previous.length < 500 && block.length > previous.length)) sections[match.key] = block;
  }
  for (const key of Object.keys(sections) as SectionKey[]) {
    sections[key] = truncateTokens(sections[key]!, SECTION_TOKENS[key]);
  }
  return sections;
}
