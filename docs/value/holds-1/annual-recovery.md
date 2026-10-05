Current annual-report recovery (24 listing IDs, 20 issuer documents/bundles).

| Listings | Period | Primary annual source |
|---|---|---|
| BAYRY.US | 2025-12-31 | [Annual report](https://reports.bayer.com/annual-report-2025/en/_assets/downloads/entire-bayer-ar25.pdf) |
| CFRHF.US, CFRUY.US | 2026-03-31 | [Annual report](https://www.richemont.com/media/ud3bety3/richemont-fy26-annual-report.pdf) |
| COCXF.US | 2025-12-31 | [Annual report](https://www.lindt-spruengli.com/amfile/file/download/id/10512/file/Integrated-Annual-Report-2025.pdf) |
| FLMNF.US | 2025-12-31 | [Annual report](https://www.fielmann-group.com/fileadmin/fielmann/Dokumente/Publikationen/Geschaeftsberichte/EN/Fielmann_Annual_Report_2025.pdf) |
| MTRBF.US | 2025-12-31 | [Annual report](https://www.metrobankonline.co.uk/globalassets/documents/investor_documents/metro-bank---annual-report-2025.pdf) |
| PIFYF.US | 2025-12-31 | [Annual report](https://cdn.prod.website-files.com/64dcf83dc7b2e3793ab75d23/69ab3405c4278d6685d2b39c_Q4%202025%20Annual%20Report%20final.pdf) |
| PEYUF.US | 2025-12-31 | [Annual report](https://www.peyto.com/Files/Financials/2025/2025AnnualReport.pdf) |
| RTLLF.US | 2025-12-31 | [Annual report](https://www.rational-online.com/media/investor-relations/veroeffentlichungen-gj-2025/rational-ag---annual-report-fy-2025-(single-pages).pdf) |
| PUIGF.US | 2025-12-31 | [Annual report](https://uploads.puig.com/uploads/PUIG_BRANDS_Consolidated_Annual_Accounts_2025_eng_33d2988396.pdf) |
| FBAK.US | 2025-12-31 | [Annual report](https://www.fnbalaska.com/wp-content/uploads/2026/03/2025-FNBA-Financial-Statements-FINAL.pdf) |
| CNSWF.US | 2025-12-31 | [Annual report](https://www.csisoftware.com/wp-content/uploads/2026/04/Q4-2025-Shareholder-Report.pdf) |
| HEINY.US, HINKF.US | 2025-12-31 | [Annual report](https://www.theheinekencompany.com/sites/heineken-corp/files/2026-02/2025_Heineken_NV_Annual_Report_Interactive_100226_FINAL.pdf) |
| HKHHF.US, HKHHY.US | 2025-12-31 | [Annual report](https://www.heinekenholding.com/sites/heinekenholding-v2/files/2026-02/heineken-holding-nv-annual-report-2025-FINAL.pdf) |
| KNCRF.US | 2025-12-31 | [Annual report](https://investors.konecranes.com/sites/konecranes/files/Annual_report_2025/governance_sustainability_and_financial_review_2025.pdf) |
| OGC.US | 2025-12-31 | [Annual report](https://assets.oceanagold.com/documents/Reports/Quarterly-Results/2025/Q4/OceanaGold-FS-2025-Q4-FINAL.pdf) |
| TRMLF.US | 2025-12-31 | [Annual report](https://tourmaline.cdn.prismic.io/tourmaline/aaidt1xvIZEnjVXx_FinalQ42025MDAFinancialStatements.pdf) |
| ZLDSF.US | 2025-12-31 | [Annual report](https://corporate.zalando.com/public/media-download/zalando-se_annual-report-2025_eng_261003_s.pdf?VersionId=NigyLbpXizEX3JRpWbGFjm2b6HWXnsnW) |
| PHJMF.US | 2025-12-31 | [Annual report](https://www.sampoerna.com/content/dam/pmicom/affiliates/sampoerna/docs/annua-report-and-sustainability-report-2025.pdf) |
| FLUIF.US | 2025-12-31 | [Annual report](https://www.cnmv.es/webservices/verdocumento/ver?e=9psaeLxyZn4huC%2FJnyqEFyJs3cK80xVpwaYndxidzOuEhY8wWp9yOrsFup0pipEp) |
| DVCMY.US, DVDCF.US | 2025-12-31 | [Annual report](https://filings.xbrl.org/213800ED5AN2J56N6Z02/2025-12-31/ESEF/NL/0/davidecamparimilano-2025-12-31-0-en/reports/davidecamparimilano-2025-12-31-0-en.xhtml) |

Full source bodies and extracted text are under `~/data/value-holds/downloads/`.
`report-page-ranges.json` records the reviewed PDF sections; `recovered-report-bindings.json` records content hashes and period bindings. The report importer retains the true fiscal period and leaves filing date null when not established. OGC uses its financial statements plus annual information form. Campari uses the full ESEF XHTML.

Lonza: 2025 annual and individual sections located on the issuer website, but local HTTP 403 prevented full-text installation. Windrock: issuer-distributed 2024 annual located but local HTTP 403; the issuer website still links a complete 2020 annual, which was downloaded and deliberately not substituted for current inputs. No 2025 annual was established. These are retrieval/current-input gaps, not proof that the reports do not exist.

The 11 recent SEC registrants (CBRS, DPC, EROC, FRVO, JAN, MAIR, PSUS, QNT, VGNT, WHK, XE) retain annual-filing holds. `sec-discovery.json` records CIKs, annual-form search results and recent filings. IPO prospectuses, registration statements and interim N-CSRS material were not relabelled as full annual operating-company reports. IDWM’s prior 2022 10-K is separately recorded in `held-inventory.json`; it is not a current 2025 report.
