import { createHash } from "node:crypto";
import { readCorpusJson, writeCorpusJson } from "../corpus";
import { createLimiter, fetchWithRetry } from "../http";
import { normalizedName } from "../universe";
import type { Company } from "../types";
import type { XbrlReport } from "./facts";

const limit = createLimiter({ perSecond: 3 / (Number(process.env.VALUE_SOURCE_WORKERS)||1) });
export async function italyFetch(url: string): Promise<Response> {
  return limit(async () => {
    const response = await fetchWithRetry(url, {
      headers: {
        "User-Agent": "GigaInvestors value hello@gigainvestors.com",
        "Accept-Encoding": "identity",
      },
      signal: AbortSignal.timeout(120_000),
      retries: 2,
    });
    if (!response.ok)
      throw new Error(
        `Italy source HTTP ${response.status}: ${new URL(url).hostname}`,
      );
    return response;
  });
}
export async function italyText(url: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await (await italyFetch(url)).text();
    } catch (error) {
      if (attempt >= 2) throw error;
    }
  }
}
export async function cachedJson<T>({
  key,
  url,
  refresh = false,
}: {
  key: string;
  url: string;
  refresh?: boolean;
}): Promise<T> {
  const cached = readCorpusJson<{ data: T }>(`raw/esef/${key}.json`);
  if (cached && !refresh) return cached.data;
  for (let attempt = 0; ; attempt++) {
    try {
      const data = (await (await italyFetch(url)).json()) as T;
      writeCorpusJson(`raw/esef/${key}.json`, {
        url,
        at: new Date().toISOString(),
        data,
      });
      return data;
    } catch (error) {
      if (attempt >= 2) throw error;
    }
  }
}
interface Gleif {
  data: Array<{
    id: string;
    attributes: {
      lei: string;
      entity: {
        legalName: { name: string };
        otherNames?: Array<{ name: string }>;
      };
    };
  }>;
}
export async function resolveItalianLei(
  company: Company,
  refresh = false,
): Promise<string | null> {
  if (company.lei) return company.lei;
  const query = new URLSearchParams({
    "filter[isin]": company.isin!,
    "page[size]": "100",
  });
  const result = company.isin ? await cachedJson<Gleif>({
    key: `gleif/${company.isin}`,
    refresh,
    url: `https://api.gleif.org/api/v1/lei-records?${query}`,
  }) : {data:[]};
  const leis = [...new Set(result.data.map((r) => r.attributes.lei))];
  if (leis.length === 1) return leis[0];
  if (leis.length > 1) return null;
  const byName = await cachedJson<Gleif>({
    key: `gleif/name-${company.code}`,
    refresh,
    url: `https://api.gleif.org/api/v1/lei-records?${new URLSearchParams({ "filter[entity.legalName]": company.name, "page[size]": "100" })}`,
  });
  const exact = byName.data.filter((r) =>
    [
      r.attributes.entity.legalName,
      ...(r.attributes.entity.otherNames ?? []),
    ].some((n) => normalizedName(n.name) === normalizedName(company.name)),
  );
  return exact.length === 1 ? exact[0].attributes.lei : null;
}
export interface EsefFiling {
  id: string;
  attributes: {
    period_end: string;
    date_added: string;
    json_url: string;
    report_url: string;
    package_url: string;
    error_count?: number;
  };
}
interface FilingPage {
  data: EsefFiling[];
  links?: { next?: string | null };
}
export async function allEsefFilings(
  lei: string,
  refresh = false,
): Promise<EsefFiling[]> {
  const filings: EsefFiling[] = [];
  const seen = new Set<string>();
  let url: string | null =
    `https://filings.xbrl.org/api/filings?${new URLSearchParams({ "filter[entity.identifier]": lei, "page[size]": "100", sort: "period_end,date_added" })}`;
  while (url) {
    if (seen.has(url)) throw new Error("Repeated ESEF pagination link");
    seen.add(url);
    const hash = createHash("sha256").update(url).digest("hex").slice(0, 16);
    const page: FilingPage = await cachedJson({
      key: `index/${lei}-${new Date().toISOString().slice(0, 10)}-${hash}`,
      url,
      refresh,
    });
    filings.push(...page.data);
    url = page.links?.next
      ? new URL(page.links.next, "https://filings.xbrl.org").href
      : null;
  }
  return [
    ...new Map(
      filings
        .filter((f) => f.attributes.json_url && f.attributes.report_url)
        .map((f) => [f.id, f]),
    ).values(),
  ].sort(
    (a, b) =>
      a.attributes.period_end.localeCompare(b.attributes.period_end) ||
      a.attributes.date_added.localeCompare(b.attributes.date_added) ||
      a.id.localeCompare(b.id),
  );
}
export function filingFacts(filing: EsefFiling): Promise<XbrlReport> {
  return cachedJson({
    key: `facts/${filing.id}`,
    url: new URL(filing.attributes.json_url, "https://filings.xbrl.org").href,
  });
}
