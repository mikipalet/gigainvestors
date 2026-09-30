export const exchangeCountries: Record<string, string> = {
  US: "US", MI: "IT", NZ: "NZ", NSE: "IN", BSE: "IN", LSE: "GB", NEO: "CA", V: "CA", TO: "CA", F: "DE", STU: "DE", MU: "DE",
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
export const nonHomeVenues = new Set(["F", "STU", "MU", "HA", "DU", "HM", "BE", "NEO"]);
export const lastResortVenues = new Set(["F", "STU", "MU", "HA", "DU", "HM", "BE", "SW", "NEO", "MX", "BA", "BK"]);
export const offshoreVenueOrder = ["HK", "US", "SHG", "SHE", "TW", "KO", "KQ", "AU", "LSE", "TO", "V", "PA", "AS", "MC"];
// The exchange-list response can omit HK even though its symbol endpoint works.
export const additionalExchanges = [{ Code: "HK", Name: "Hong Kong", Country: "Hong Kong", CountryISO2: "HK", Currency: "HKD" }];
export const universeChecks = { topCount: 1000, minHkCompanies: 2000, maxUsCapMultiple: 1.3 };

// Rio Tinto's dual-listed parents share one business but have separate domicile ISINs.
// Keep this explicit: equal names alone must not combine unrelated home issuers.
export const dualListedIssuers: Record<string, string> = {
  AU000000RIO1: "rio-tinto", GB0007188757: "rio-tinto",
};

// Verified receipts whose EODHD symbol names omit ADR/ADS. Match identifiers,
// never names: ordinary US stocks must not inherit these exceptions.
// TSM: https://www.adr.com/drprofile/874039100
// BHP: https://depositaryreceipts.citi.com/adr/guides/pgm_d.aspx?cusip=088606108&pageId=16&subpageID=104&typeDisplay=A
// NVO: https://api.markitdigital.com/jpmadr-public/v1/cms/document?cmsId=b8e6af19336b45cc8b7fdf8538d778e5&sequenceNo=10
export const adrUnderlyingIsins: Record<string, string> = {
  US8740391003: "TW0002330008",
  US0886061086: "AU000000BHP4",
  US6701002056: "DK0062498333",
  // BNY depositary directory profiles (CUSIPs 910873405, 48241A105,
  // 824596100, 17133Q502) give these exact receipt/underlying pairs.
  // https://www.adrbny.com/directory/dr-details/_jcr_content/root/drDetailsComponent.overview.overview.910873405.html
  // https://www.adrbny.com/directory/dr-details/_jcr_content/root/drDetailsComponent.overview.overview.48241A105.html
  // https://www.adrbny.com/directory/dr-details/_jcr_content/root/drDetailsComponent.overview.overview.824596100.html
  // https://www.adrbny.com/directory/dr-details/_jcr_content/root/drDetailsComponent.overview.overview.17133Q502.html
  US9108734057: "TW0002303005",
  US48241A1051: "KR7105560007",
  US8245961003: "KR7055550008",
  US17133Q5027: "TW0002412004",
  // Citi has the current WDS underlying; BNY still shows the old WPL ISIN.
  // https://depositaryreceipts.citi.com/adr/guides/estfee.aspx?cusip=980228308&pageId=15&subpageID=114
  US9802283088: "AU0000224040",
};

// ResMed CDI: https://announcements.asx.com.au/asxpdf/20260501/pdf/06z3nqxsjsf183.pdf
// Newmont ASX admission notice identifies this AU ISIN as its US-stock CDI.
// https://cdn-api.markitdigital.com/apiman-gateway/ASX/asx-research/1.0/file/2924-02730602-3A629238
export const cdiUnderlyingIsins: Record<string, string> = { AU0000297962: "US6516391066", AU000000RMD6: "US7611521078" };

// Exact vendor-name variants, not fuzzy matching. Receipt identities verified at:
// https://www.adrbny.com/directory/dr-details/_jcr_content/root/drDetailsComponent.overview.overview.465562106.html
// https://www.adrbny.com/directory/dr-details/_jcr_content/root/drDetailsComponent.overview.overview.05946K101.html
export const issuerNameAliases: Record<string, string> = {
  itauunibancobanco: "itauunibanco",
  bancobilbaoviscayaargentaria: "bancobilbaovizcayaargentaria",
};
