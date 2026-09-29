import { readJsonl } from "../../lib/value/corpus";
import type { Company } from "../../lib/value/types";
import { normalizedName } from "../../lib/value/universe";
import { universeChecks } from "../../lib/value/universe-config";

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
    ["NVDA.US", "US"], ["AAPL.US", "US"], ["2330.TW", "TW"], ["0700.HK", "HK"], ["ASML.AS", "NL"],
    ["NESN.SW", "CH"], ["SHOP.TO", "CA"], ["005930.KO", "KR"], ["HSBA.LSE", "GB"],
  ]) {
    const company = byId.get(id);
    checks.push({ label: `${id} primary / ${country}`, ok: company?.country === country && company.listings.includes(id),
      detail: company ? `country=${company.country}; listings=${company.listings.join(",")}` : "missing" });
  }
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
