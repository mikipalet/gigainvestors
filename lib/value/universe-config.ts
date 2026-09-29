export const exchangeCountries: Record<string, string> = {
  US: "US", LSE: "GB", NEO: "CA", V: "CA", TO: "CA", F: "DE", STU: "DE", MU: "DE",
  HA: "DE", DU: "DE", HM: "DE", BE: "DE", XETRA: "DE", LU: "LU", VI: "AT", PA: "FR", BR: "BE",
  SW: "CH", MC: "ES", LS: "PT", AS: "NL", CO: "DK", ST: "SE", OL: "NO", HE: "FI",
  IR: "IE", VFEX: "ZW", XZIM: "ZW", PR: "CZ", XBOT: "BW", LUSE: "ZM", EGX: "EG",
  GSE: "GH", USE: "UG", XNAI: "KE", RSE: "RW", DSE: "TZ", BC: "MA", SEM: "MU",
  MSE: "MW", XNSA: "NG", KQ: "KR", KO: "KR", BUD: "HU", WAR: "PL", PSE: "PH",
  BK: "TH", AU: "AU", SHE: "CN", AT: "GR", SHG: "CN", JK: "ID", JSE: "ZA", KAR: "PK",
  SN: "CL", CM: "LK", VN: "VN", KLSE: "MY", RO: "RO", BA: "AR", SA: "BR", MX: "MX",
  ZSE: "HR", TW: "TW", TWO: "TW", LIM: "PE", HK: "HK", SG: "SG", JP: "JP", TSE: "JP",
};


export const offshoreDomiciles = new Set(["KY", "BM", "VG", "JE", "GG", "IM", "CW", "PA", "MH", "LR", "BS", "GI", "MU", "CY", "LU", "IE", "NL"]);
export const secondaryVenues = new Set(["F", "STU", "MU", "HA", "DU", "HM", "BE", "XETRA", "SW", "NEO", "MX", "SN", "LIM", "BA", "BK", "VI", "LU", "LSE"]);
export const lastResortVenues = new Set(["F", "STU", "MU", "HA", "DU", "HM", "BE", "SW", "NEO", "MX", "SA", "BA", "BK"]);
export const offshoreVenueOrder = ["HK", "US", "SHG", "SHE", "TW", "KO", "KQ", "AU", "LSE", "TO", "V"];
// The exchange-list response can omit HK even though its symbol endpoint works.
export const additionalExchanges = [{ Code: "HK", Name: "Hong Kong", Country: "Hong Kong", CountryISO2: "HK", Currency: "HKD" }];
export const universeChecks = { topCount: 300, minHkCompanies: 2000 };

// Rio Tinto's dual-listed parents share one business but have separate domicile ISINs.
// Keep this explicit: equal names alone must not combine unrelated home issuers.
export const dualListedIssuers: Record<string, string> = {
  AU000000RIO1: "rio-tinto", GB0007188757: "rio-tinto",
};
