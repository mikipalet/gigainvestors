import { createLimiter, fetchWithRetry } from "../http";
import type { SectionKey } from "../types";
import { SECTION_TOKENS, truncateTokens } from "./cut-sections";

const limit = createLimiter({ perSecond: 3 });

export async function fetchEsef(url: string): Promise<Response> {
  const response = await limit(() => fetchWithRetry(url));
  if (!response.ok) throw new Error(`ESEF request failed (${response.status})`);
  return response;
}

export async function latestEsef(lei: string): Promise<{ url: string; filed: string; period: string } | null> {
  const query = new URLSearchParams({ "filter[entity.identifier]": lei, sort: "-period_end", "page[size]": "1" });
  const response = await fetchEsef(`https://filings.xbrl.org/api/filings?${query}`);
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
  letter: /(letter|message) (from|of) the (ceo|chair|chief executive|president)|lettre aux actionnaires|brief an die aktionäre|carta del presidente/i,
  business: /business (model|overview)|our business|strategy|activités|geschäftsmodell/i,
  risk: /risk(s)? (factors|management)|principal risks|facteurs de risques|risikobericht/i,
  mdna: /(financial|operating) review|management report|rapport de gestion|lagebericht/i,
  compensation: /remuneration (report|policy)|(?:board of management|supervisory board) remuneration|rémunération|vergütungsbericht/i,
  notes: /notes to the (consolidated )?financial statements|notes aux états financiers|anhang/i,
  auditor: /independent auditor|rapport des commissaires aux comptes|bestätigungsvermerk/i,
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
  const paragraphs = [...text.matchAll(/[^\n]+/g)];
  const navigation = navigationPositions(paragraphs);
  const matches: { key: SectionKey; index: number; after: number; exact: boolean; navigation: boolean; contents: boolean }[] = [];
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
    if (heading.length > 120 || /[.!?]$/.test(heading)) continue;
    for (const [key, pattern] of Object.entries(headings)) {
      const found = pattern.exec(heading);
      if (found) {
        matches.push({ key: key as SectionKey, index: paragraph.index, after: paragraph.index + paragraph[0].length, exact: found[0].length === heading.length, navigation: navigation.has(index),
          contents: /^\d+$/.test(paragraphs[index + 1]?.[0].trim() ?? "") });
        break;
      }
    }
  }
  const sections: Partial<Record<SectionKey, string>> = {};
  const exact = new Set<SectionKey>();
  for (let index = 0; index < matches.length; index++) {
    const match = matches[index];
    if (match.navigation || match.contents) continue;
    const block = text.slice(match.index, matches[index + 1]?.index ?? end).trim();
    const previous = sections[match.key];
    // Complete heading matches outrank incidental mentions in wrapped prose.
    if (!previous || (previous.length <= 500 && block.length > previous.length)
      || (match.exact && !exact.has(match.key) && block.length >= 500)) {
      sections[match.key] = block;
      if (match.exact) exact.add(match.key);
      else exact.delete(match.key);
    }
  }
  if (!sections.business) {
    const first = matches.find((match) => !match.navigation && !match.contents);
    sections.business = text.slice(first?.after ?? 2000).trim();
  }
  for (const key of Object.keys(sections) as SectionKey[]) {
    sections[key] = truncateTokens(sections[key]!, SECTION_TOKENS[key]);
  }
  return sections;
}
