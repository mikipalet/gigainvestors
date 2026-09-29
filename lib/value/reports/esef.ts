import { esefHeadingText } from "./esef-headings";
import { createLimiter, fetchWithRetry } from "../http";
import type { SectionKey } from "../types";
import { SECTION_TOKENS, truncateTokens } from "./cut-sections";

const limit = createLimiter({ perSecond: 3 });

export async function fetchEsef(url: string): Promise<Response> {
  const response = await fetchWithRetry(url, { beforeAttempt: () => limit(async () => {}) });
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

export function cutEsefSections(xhtml: string): Partial<Record<SectionKey, string>> {
  const { text, marker } = esefHeadingText(xhtml);
  const clean = (value: string) => value.replace(new RegExp(marker + "[\\d.]+\\|", "g"), "").trim();
  const matches: { key: SectionKey; index: number; after: number; contents: boolean; exact: boolean; size: number }[] = [];
  let end = text.length;
  for (const match of text.matchAll(new RegExp(marker + "([\\d.]+)\\|([^\\n]+)", "g"))) {
    const heading = match[2].replace(/^\d+[.)]?\s+/, "").replace(/\s*\(continued\)$/i, "");
    if (/^read more\b/i.test(heading)) continue;
    if (/^(definitions|glossary)$/i.test(heading)) { end = match.index; break; }
    for (const [key, pattern] of Object.entries(headings)) {
      if (!pattern.test(heading)) continue;
      const after = match.index + match[0].length;
      matches.push({ key: key as SectionKey, index: match.index, after,
        size: Number(match[1]), exact: pattern.exec(heading)?.[0].length === heading.length,
        contents: /^\s*\d+\s*(?:\n|$)/.test(text.slice(after)) });
      break;
    }
  }
  const sections: Partial<Record<SectionKey, string>> = {};
  const selected = new Map<SectionKey, { size: number; exact: boolean }>();
  for (let index = 0; index < matches.length; index++) {
    const match = matches[index];
    if (match.contents) continue;
    const until = matches.slice(index + 1).find(next => next.key !== match.key)?.index ?? end;
    if (clean(text.slice(match.after, until)).length < 1500) continue;
    const previous = selected.get(match.key);
    if (!previous || match.size > previous.size || (match.size === previous.size && match.exact && !previous.exact)) {
      sections[match.key] = clean(text.slice(match.index, until));
      selected.set(match.key, match);
    }
  }
  if (!sections.business) {
    const first = matches.find(match => !match.contents);
    const fallback = clean(text.slice(first?.after ?? 2000, end));
    if (fallback.length >= 1500) sections.business = fallback;
  }
  for (const key of Object.keys(sections) as SectionKey[]) {
    sections[key] = truncateTokens(sections[key]!, SECTION_TOKENS[key]);
  }
  return sections;
}
