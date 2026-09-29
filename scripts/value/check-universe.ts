import { readJsonl } from "../../lib/value/corpus";
import type { Company } from "../../lib/value/types";
import { normalizedName, isGlobalDepositary } from "../../lib/value/universe";
import { exchangeCountries, universeChecks } from "../../lib/value/universe-config";

interface Check { label: string; ok: boolean; detail: string }

export function checkUniverse(companies: Company[]): Check[] {
  const byId = new Map(companies.map((company) => [company.id, company]));
  const top = [...companies].sort((a, b) => (b.marketCapUsd ?? -Infinity) - (a.marketCapUsd ?? -Infinity)
    || a.id.localeCompare(b.id)).slice(0, universeChecks.topCount);
  const names = new Map<string, string[]>();
  for (const company of top) {
    const name = normalizedName(company.name);
    names.set(name, [...(names.get(name) ?? []), company.id]);
  }
  const duplicates = [...names].filter(([, ids]) => ids.length > 1);
  const checks: Check[] = [{
    label: `Top ${universeChecks.topCount} duplicate normalized names`,
    ok: top.length === universeChecks.topCount && duplicates.length === 0,
    detail: `${duplicates.length} duplicate groups (${top.length} rows checked)${duplicates.length ? `: ${duplicates.map(([name, ids]) => `${name}=${ids.join(",")}`).join("; ")}` : ""}`,
  }];
  for (const [id, country] of [
    ["VALE3.SA", "BR"], ["OXY.US", "US"], ["DPZ.US", "US"], ["LLY.US", "US"], ["NVDA.US", "US"], ["AAPL.US", "US"], ["2330.TW", "TW"], ["0700.HK", "HK"], ["ASML.AS", "NL"],
    ["NESN.SW", "CH"], ["SHOP.TO", "CA"], ["005930.KO", "KR"], ["HSBA.LSE", "GB"],
  ]) {
    const company = byId.get(id);
    checks.push({ label: `${id} primary / ${country}`, ok: company?.country === country && company.listings.includes(id),
      detail: company ? `country=${company.country}; listings=${company.listings.join(",")}` : "missing" });
  }
  const dpz = byId.get("DPZ.US");
  const dom = byId.get("DOM.LSE");
  checks.push({ label: "DPZ.US separate from DOM.LSE", ok: !!dpz && !!dom
    && !dpz.listings.includes("DOM.LSE") && !dom.listings.includes("DPZ.US"),
    detail: `DPZ.US=${dpz ? "present" : "missing"}; DOM.LSE=${dom ? "present" : "missing"}` });
  const listingsByIsin = new Map<string, string[]>();
  for (const company of companies) {
    if (company.isin) listingsByIsin.set(company.isin, [...(listingsByIsin.get(company.isin) ?? []), ...company.listings]);
  }
  const secondary = new Set(["BA", "SW", "MU", "F", "NEO", "MX"]);
  const nonHomeVenues = new Set(["F", "STU", "MU", "HA", "DU", "HM", "BE", "NEO"]);
  const displacedHomes = companies.filter(company => {
    if (!secondary.has(company.exchange) || !company.isin) return false;
    const country = company.isin.slice(0, 2);
    if (exchangeCountries[company.exchange] === country && !nonHomeVenues.has(company.exchange)) return false;
    return (listingsByIsin.get(company.isin) ?? company.listings).some(id => {
      const exchange = id.slice(id.lastIndexOf(".") + 1);
      return exchange !== company.exchange && !nonHomeVenues.has(exchange) && exchangeCountries[exchange] === country;
    });
  });
  checks.push({ label: "No secondary primaries when a home listing exists", ok: displacedHomes.length === 0,
    detail: `${displacedHomes.length} violations${displacedHomes.length ? `: ${displacedHomes.map(company => company.id).join(",")}` : ""}` });
  const gdrs = top.filter((company) => isGlobalDepositary(company.name));
  checks.push({ label: "No GDR primaries in top 300", ok: gdrs.length === 0, detail: `${gdrs.length} GDR primaries` });
  const sk = byId.get("000660.KO");
  checks.push({ label: "SKHY.US merged under 000660.KO", ok: !!sk?.listings.includes("SKHY.US") && !byId.has("SKHY.US"), detail: sk?.listings.join(",") ?? "missing" });
  const tsm = byId.get("2330.TW");
  checks.push({ label: "TSM.US merged under 2330.TW", ok: !!tsm?.listings.includes("TSM.US") && !byId.has("TSM.US"), detail: tsm?.listings.join(",") ?? "missing" });
  const preferred = companies.flatMap((company) => company.listings).filter((id) => id === "005935.KO");
  checks.push({ label: "Samsung preferred excluded", ok: preferred.length === 0, detail: `${preferred.length} preferred listings` });
  const toyota = byId.get("TM.US");
  const invented = companies.flatMap((company) => company.listings).filter((id) => /^7203\.(JP|TSE)$/.test(id));
  checks.push({ label: "Toyota TM.US ADR; 7203 absent", ok: !!toyota && /\bADR\b/i.test(toyota.name) && invented.length === 0,
    detail: `TM.US=${toyota ? "present" : "missing"}; 7203 listings=${invented.length}` });
  const hk = companies.filter((company) => company.country === "HK").length;
  checks.push({ label: `HK company count >= ${universeChecks.minHkCompanies}`, ok: hk >= universeChecks.minHkCompanies, detail: String(hk) });
  return checks;
}

export default async function run(): Promise<void> {
  const companies = readJsonl<Company>("universe.jsonl");
  console.log(`check-universe: ${companies.length} companies`);
  const checks = checkUniverse(companies);
  for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"} ${check.label}: ${check.detail}`);
  if (checks.some((check) => !check.ok)) throw new Error("Universe acceptance checks failed");
}
