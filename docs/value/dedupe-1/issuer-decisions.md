# Issuer identity decisions

Identity joins use security/legal-entity identifiers or issuer/depositary confirmation. Names, websites and US/CA NSIN prefixes are candidate signals only; an ISIN country prefix never joins issuers. Source identifier records and all selection scores are in `lib/value/issuer-registry.json`.

| Canonical | Retired listing IDs | Evidence | Canonical analysis |
|---|---|---|---|
| 0883.HK | 600938.SHG | Issuer explicitly gives Hong Kong 00883 and Shanghai 600938. [Source](https://www.cnoocltd.com/english/investorrelations/stockinformation/) | 28 history years; description; Hang Seng |
| 0941.HK | 600941.SHG | Same issuer Hong Kong shares and Shanghai A shares; page 14 gives both codes. [Source](https://www.chinamobileltd.com/en/ir/webcasts/pre220323.pdf) | 29 history years; description; Hang Seng |
| 0981.HK | 688981.SHG | Issuer SMIC identifies SEHK 00981 and SSE STAR 688981. [Source](https://www.hkexnews.hk/listedco/listconews/sehk/2025/0807/2025080700636.pdf) | 22 history years; description; Hang Seng |
| 2057.HK | ZTO.US | 2057.HK ↔ ZTOB.F: ISIN:KYG9897K1058, LEI:549300SCJPK3YZJTJR78; 2057.HK ↔ ZTO.US: LEI:549300SCJPK3YZJTJR78 | 12 history years; description; Hang Seng |
| 600690.SHG | 6690.HK | Issuer gives SH600690 and 06690. [Source](https://www.haier.com/global/investor-relationship/) | 30 history years; description; CSI 300 |
| ABI.BR | BUDFF.US | Equal shareClassFIGI BBG00DQ4YZ27; mapping raw archived in figi.json. [Source](https://api.openfigi.com/v3/mapping) | 26 history years; ESEF; Euro Stoxx 50, STOXX Europe 600, BEL 20 |
| ABVX.US | ABVX.PA | ADS represents one FR0012333284 ordinary share on Euronext. [Source](https://ir.abivax.com/news-releases/news-release-details/abivax-announces-launch-public-offering/) | 13 history years; 20-F; no baseline index |
| AEG.US | AGN.AS | AEG.US ↔ AGN.AS: vendor listing/primary; 0Q0Y.LSE ↔ AGN.AS: vendor listing/primary | 30 history years; 20-F; no baseline index |
| ALK-B.CO | AKBLF.US | ALK ISIN changed DK0060027142 to DK0061802139 after 1:20 split; cached OTC retains old ISIN. [Source](https://ir.alk-abello.com/news-releases/news-release-details/decision-complete-share-split-ratio-120) | 22 history years; ESEF; STOXX Europe 600 |
| AMCR.US | AMC.AU | 485B.STU ↔ AMC.AU: vendor listing/primary; 485B.F ↔ AMCR.US: vendor listing/primary; AMC.AU ↔ AMCR.US: vendor listing/primary; 485B.F ↔ AMC.AU: ISIN:AU000000AMC4, LEI:549300GSODGFCDQ3DI89; 485B.F ↔ 485B.STU: ISIN:AU000000AMC4, LEI:549300GSODGFCDQ3DI89 | 10 history years; 10-K; S&P 500; FROZEN |
| ASAI3.SA | ASAIY.US | Issuer investor relations ASAIY ADR listing for Sendas/ASAI3. [Source](https://ri.assai.com.br/en/investor-services/quotes-and-charts-bovespa/asaiy/) | 14 history years; description; Ibovespa |
| BABA.US | 9988.HK | 9988.HK ↔ BABA.US: vendor listing/primary; 2RR.F ↔ 9988.HK: ISIN:KYG017191142, LEI:5493001NTNQJDH60PM02, vendor listing/primary; 9988.HK ↔ BABAF.US: vendor listing/primary; 2RR.F ↔ BABAF.US: ISIN:KYG017191142, LEI:5493001NTNQJDH60PM02; 2RR.F ↔ BABA.US: LEI:5493001NTNQJDH60PM02; BABA.US ↔ BABAF.US: CIK:1577552 | 20 history years; 20-F; no baseline index |
| BATRA.US | BATRK.US | Same issuer CIK 1958140; classes A and C. Vendor old Liberty CIK rejected. [Source](https://www.sec.gov/Archives/edgar/data/1958140/000110465926020650/batra-20251231x10k.htm) | 10 history years; 10-K; no baseline index |
| BEI.XETRA | BDRFY.US | BDRFY.US ↔ BEI.XETRA: LEI:L47NHHI0Z9X22DV46U41 | 24 history years; description; DAX 40 |
| BH.US | BH-A.US | BH-A.US ↔ BH.US: CIK:1726173, LEI:549300J4OQ973AEQEG06 | 30 history years; 10-K; no baseline index |
| BIDU.US | 9888.HK | BIDU ADS represents eight 9888 Class A ordinary shares. [Source](https://ir.baidu.com/news-releases/news-release-details/baidu-pursue-voluntary-conversion-dual-primary-listing-main/) | 23 history years; 20-F; no baseline index |
| CARL-B.CO | CABJF.US | Equal shareClassFIGI BBG001S97P77; mapping raw archived in figi.json. [Source](https://api.openfigi.com/v3/mapping) | 24 history years; ESEF; STOXX Europe 600, OMXC25 |
| DEMANT.CO | WILLF.US | Equal shareClassFIGI BBG001S6BY88; mapping raw archived in figi.json. [Source](https://api.openfigi.com/v3/mapping) | 24 history years; ESEF; STOXX Europe 600, OMXC25 |
| DGE.LSE | DGEAF.US | Equal shareClassFIGI BBG001S6TB61; mapping raw archived in figi.json. [Source](https://api.openfigi.com/v3/mapping) | 11 history years; ESEF; FTSE 100, STOXX Europe 600 |
| DRREDDY.NSE | RDY.US | 20-F identifies RDY ADS and DRREDDY NSE ordinary shares. [Source](https://www.sec.gov/Archives/edgar/data/1135951/000157587225000393/rdy-20250331.htm) | 12 history years; description; Nifty 50 |
| ERF.PA | ERFSF.US | ERF.PA ↔ ERFSF.US: ISIN:FR0014000MR3, LEI:529900JEHFM47DYY3S57, vendor listing/primary | 24 history years; ESEF; STOXX Europe 600, CAC 40, SBF 120 |
| FMS.US | FME.XETRA | FME.XETRA ↔ FMS.US: LEI:549300CP8NY40UP89Q40, vendor listing/primary | 29 history years; 20-F; STOXX Europe 600 |
| FMX.US | FEMSAUBD.MX | FEMSAUBD.MX ↔ FMX.US: vendor listing/primary; FEMSAUBD.MX ↔ FOMC.F: ISIN:MXP320321310, vendor listing/primary | 1 history years; 20-F; no baseline index |
| FRFHF.US | FFH.TO | FFH.TO ↔ FRFHF.US: ISIN:CA3039011026, vendor listing/primary | 30 history years; 40-F; no baseline index |
| FWONK.US | FWONA.US | Liberty Media CIK 1560385; classes A and C; split-offs excluded. [Source](https://www.libertymedia.com/investors/stock-cost-basis) | 17 history years; 10-K; no baseline index |
| GLIBA.US | GLIBK.US | Same issuer series A and C; US36164V issuer NSIN prefix. [Source](https://www.libertycapitalcorp.com/investors/stock-data/faq) | 3 history years; 10-K; no baseline index |
| GSK.LSE | GSK.US | GSK.LSE ↔ GSK.US: LEI:5493000HZTVUYLO1D793, vendor listing/primary | 30 history years; ESEF; FTSE 100, STOXX Europe 600 |
| HEN.XETRA | HEN3.XETRA | HEN.XETRA ↔ HEN3.XETRA: LEI:549300VZCL1HTH4O4Y49 | 29 history years; description; DAX 40 |
| HEXA-B.ST | HXGBY.US | HEXA-B.ST ↔ HXGBY.US: LEI:549300WJFW6ILNI4TA80 | 24 history years; ESEF; OMXS30 |
| HKHGF.US | HKLB.LSE | HKHGF.US ↔ HKLB.LSE: ISIN:BMG4587L1090, LEI:213800XCHYNRPAYGXW28 | 29 history years; ESEF; no baseline index |
| INGA.AS | ING.US | ING.US ↔ INGA.AS: LEI:549300NYKK9MWM7GGW15, vendor listing/primary | 29 history years; ESEF; Euro Stoxx 50, STOXX Europe 600, AEX |
| ITUB.US | ITUB3.SA | ITUB.US ↔ ITUB3.SA: vendor listing/primary | 26 history years; 20-F; no baseline index |
| JHX.US | JHX.AU | ASX JHX CDIs represent same issuer 1:1; CIK 1159152. [Source](https://www.sec.gov/Archives/edgar/data/1159152/000115915225000068/ex991statementofcdisonis.htm) | 27 history years; 10-K; no baseline index |
| LBTYA.US | LBTYK.US | LBTYA.US ↔ LBTYK.US: CIK:1570585, vendor listing/primary | 26 history years; 10-K; no baseline index |
| LI.US | 2015.HK | 2015.HK ↔ LI.US: LEI:2549003R73Q70J5H4I65 | 8 history years; 20-F; no baseline index |
| LILA.US | LILAK.US | LILA.US ↔ LILAK.US: CIK:1712184, LEI:213800YWQHEAX7CAVO83, vendor listing/primary | 14 history years; 10-K; no baseline index |
| LLYVA.US | LLYVK.US | Liberty Live CIK 2078416, independent since December 2025; A and C. [Source](https://www.sec.gov/Archives/edgar/data/0002078416/000110465926035278/tm265250d4_ars.pdf) | 5 history years; 10-K; no baseline index |
| NSRGY.US | NESN.SW, NSRGF.US | NESN.SW ↔ NSRGF.US: ISIN:CH0038863350, LEI:KY37LUS27QQX7BB93L28, vendor listing/primary; NESN.SW ↔ NSRGY.US: LEI:KY37LUS27QQX7BB93L28 | 10 history years; annual-report; no baseline index |
| NTES.US | 9999.HK | 9999.HK ↔ NTES.US: vendor listing/primary; 4Y01.F ↔ NETTF.US: ISIN:KYG6427A1022, LEI:5299004AF4DSJDB0PA32; 4Y01.F ↔ 9999.HK: ISIN:KYG6427A1022, LEI:5299004AF4DSJDB0PA32; 4Y01.F ↔ NTES.US: LEI:5299004AF4DSJDB0PA32; NETTF.US ↔ NTES.US: CIK:1110646 | 27 history years; 20-F; no baseline index |
| NWS.US | NWS.AU, NWSA.US | NWS.AU ↔ NWS.US: vendor listing/primary; NWS.AU ↔ NWSA.US: vendor listing/primary; NC0E.STU ↔ NWS.AU: vendor listing/primary; NWS.US ↔ NWSA.US: CIK:1564708, vendor listing/primary; NC0E.F ↔ NWS.US: LEI:549300ITS31QK8VRBQ14, vendor listing/primary; NC0E.F ↔ NC0E.STU: ISIN:AU000000NWS2, LEI:549300ITS31QK8VRBQ14; NC0E.F ↔ NWS.AU: ISIN:AU000000NWS2, LEI:549300ITS31QK8VRBQ14; NC0E.F ↔ NWSA.US: LEI:549300ITS31QK8VRBQ14 | 17 history years; 10-K; S&P 500 |
| NXE.US | NXG.AU | Same issuer TSX/NYSE NXE and ASX NXG. [Source](https://announcements.asx.com.au/asxpdf/20250617/pdf/06kt43r5lr47b7.pdf) | 14 history years; 40-F; no baseline index |
| OR.PA | LRLCF.US | LRLCF.US ↔ OR.PA: ISIN:FR0000120321, LEI:529900JI1GG6F7RKVI53, vendor listing/primary | 28 history years; ESEF; Euro Stoxx 50, STOXX Europe 600, CAC 40, SBF 120 |
| RI.PA | PDRDF.US, PRNDY.US | PDRDF.US ↔ PRNDY.US: CIK:899108; Issuer pairs PRNDY US7142643060 with underlying FR0000120693; PDRDF same CIK as PRNDY. [Source](https://www.pernod-ricard.com/sr/node/116) | 24 history years; ESEF; STOXX Europe 600, CAC 40, SBF 120 |
| RKT.LSE | RBGPF.US | RBGPF.US ↔ RKT.LSE: vendor listing/primary | 24 history years; description; FTSE 100, STOXX Europe 600 |
| RMS.PA | HESAY.US | Depositary identifies HESAY as Hermes International ADR. [Source](https://depositaryreceipts.citi.com/adr/guides/viewDocument.aspx?annid=4&divid=037&secid=HESAY&type=P) | 25 history years; ESEF; Euro Stoxx 50, CAC 40, SBF 120 |
| RR.LSE | RYCEY.US | RR.LSE ↔ RYCEY.US: LEI:213800EC7997ZBLZJH69 | 30 history years; ESEF; FTSE 100, STOXX Europe 600 |
| RTO.LSE | RTO.US | RTO ADS represents five issuer ordinary shares. [Source](https://www.rentokil-initial.com/investors/shareholder-centre/adr_information.aspx) | 10 history years; ESEF; FTSE 100, STOXX Europe 600 |
| RUSHA.US | RUSHB.US | RUSHA.US ↔ RUSHB.US: CIK:1012019, LEI:529900V3XHTN7A6DFT17, vendor listing/primary | 30 history years; 10-K; no baseline index |
| SNN.US | SN.LSE | SN.LSE ↔ SNN.US: LEI:213800ZTMDN8S67S1H61, vendor listing/primary | 30 history years; 20-F; no baseline index |
| SSPG.LSE | SSPPF.US | SSPG.LSE ↔ SSPPF.US: ISIN:GB00BGBN7C04, LEI:213800QGNIWTXFMENJ24, vendor listing/primary | 15 history years; description; FTSE 250; FROZEN |
| UAA.US | UA.US | UA.US ↔ UAA.US: CIK:1336917, LEI:549300D4549QKWETZ406, vendor listing/primary | 6 history years; 10-K; no baseline index |
| UHAL-B.US | UHAL.US | UHAL-B.US ↔ UHAL.US: CIK:4457 | 30 history years; 10-K; no baseline index |
| VOW.XETRA | VOW3.XETRA | VOW.XETRA ↔ VOW3.XETRA: LEI:529900NNUPAGGOMPXZ31 | 26 history years; description; Euro Stoxx 50 |
| VTMX.US | VESTA.MX | F-1: VTMX ADS represents 10 VESTA common shares. [Source](https://ir.vesta.com.mx/sec-filings/all-sec-filings/content/0001140361-23-031309/0001140361-23-031309.pdf) | 2 history years; 20-F; no baseline index |
| ZG.US | Z.US | Z.US ↔ ZG.US: CIK:1617640, LEI:2549002XEELQDIR6FU05, vendor listing/primary | 20 history years; 10-K; no baseline index |

## Rejected look-alikes

| IDs | Evidence for separation |
|---|---|
| RBC.US, RRX.US | Stale vendor CIK/LEI on RBC; SEC RBC CIK is 1324948, RRX 82811. [Source](https://www.sec.gov/Archives/edgar/data/1324948/000121390026087860/0001213900-26-087860-index.htm) RBC.US: ISIN US75524B1044, LEI QH78R09VCJGQKPBPYU33, CIK 0000082811; RRX.US: ISIN US7587501039, LEI QH78R09VCJGQKPBPYU33, CIK 0000082811 |
| NAVI.US, SLM.US | Distinct CIK 1593538 vs 1032033; vendor reused LEI across 2014 spin-off. [Source](https://www.navient.com/about) NAVI.US: ISIN US63938C1080, LEI 54930067J0ZNOEBRW338, CIK 0001593538; SLM.US: ISIN US78442P1066, LEI 54930067J0ZNOEBRW338, CIK 0001032033 |
| BATRA.US, FWONA.US, LLYVA.US | Separate issuers after split-offs: CIK 1958140 / 1560385 / 2078416. [Source](https://www.libertymedia.com/investors/stock-cost-basis) BATRA.US: ISIN US0477261046, CIK 0001560385; FWONA.US: ISIN US5312297717, CIK 0001560385; LLYVA.US: ISIN US5309091008, CIK 0001560385 |
| GHC.US, GHM.US | Graham Holdings and Graham Corporation: distinct CIK/LEI; name stem not identity.  GHC.US: ISIN US3846371041, LEI 529900BOSCEEEMAFQJ29, CIK 0000104889; GHM.US: ISIN US3845561063, LEI 254900EI9P4LTY524J77, CIK 0000716314 |
| 9434.JP, 9984.JP | SoftBank Corp and SoftBank Group: subsidiary vs parent; separate Japanese issuers.  9434.JP: ; 9984.JP:  |
| APA.US, APA.AU | Unrelated US exploration issuer and Australian infrastructure issuer.  APA.US: ISIN US03743Q1085, CIK 0000006769; APA.AU: ISIN AU000000APA1, LEI 984500M36D4QE6DC2N32 |
| MRK.US, MRK.XETRA | Merck & Co and Merck KGaA: unrelated legal issuers.  MRK.US: ISIN US58933Y1055, LEI MZK1AT00SJV4XB7WNL71, CIK 0000310158; MRK.XETRA: ISIN DE0006599905, LEI 529900OAREIS0MOPTW25 |
| JKS.US, 688223.SHG | JinkoSolar Holding and its separately listed operating subsidiary. [Source](https://ir.jinkosolar.com/news-releases/news-release-details/jinkosolar-announces-proposed-change-company-name-jinko-holdings) JKS.US: ISIN US47759T1007, LEI 529900Y93WNCS05FG852, CIK 0001481513; 688223.SHG: ISIN CNE100005R96 |
| 009970.KO, 111770.KO | Youngone Holdings and Youngone operating issuer.  009970.KO: ISIN KR7009970005; 111770.KO: ISIN KR7111770004 |
| 002790.KO, 090430.KO | Amorepacific Holdings and Amorepacific operating issuer.  002790.KO: ISIN KR7002790004; 090430.KO: ISIN KR7090430000 |
| CLW.AU, CQR.AU, CHC.AU | Separately listed trusts and manager, same website not identity.  CLW.AU: ISIN AU000000CLW0, LEI 25490085H6GRZKHWFL78; CQR.AU: ISIN AU000000CQR9, LEI 254900SH49MQ8WY4NO45; CHC.AU: ISIN AU000000CHC0, LEI 254900PJ75X7THUAD153 |
| CNI.AU, CIP.AU | Centuria manager and separately listed industrial REIT.  CNI.AU: ISIN AU000000CNI5; CIP.AU: ISIN AU000000CIP0, LEI 984500D6B1D6BC3F7B08 |
| FRZCF.US, FRLOF.US | Frasers Centrepoint Trust and Frasers Logistics & Commercial Trust: separate trusts.  FRZCF.US: ISIN SG1T60930966; FRLOF.US:  |
| KMAR.OL, KOG.OL | Kongsberg Maritime and Kongsberg Gruppen: separate listed issuers after split. [Source](https://www.kongsbergmaritime.com/news-and-events/news-archive/2026/kongsberg-maritime-begins-trading-on-oslo-stock-exchange/) KMAR.OL: ISIN NO0013697029; KOG.OL: ISIN NO0013536151 |
| DIM.PA, SRT3.XETRA | Sartorius Stedim Biotech and Sartorius: separately listed subsidiary and parent.  DIM.PA: ISIN FR0013154002, LEI 52990006IVXY7GCSSR39; SRT3.XETRA: ISIN DE0007165631, LEI 529900EQV2DY4FOAMU38 |
| COMP.US, CPG.LSE | Compass real-estate issuer vs UK catering issuer.  COMP.US: ISIN US20464U1007, CIK 0001563190; CPG.LSE: ISIN GB00BD6K4575, LEI 2138008M6MH9OZ6U2T68 |
| AGX.US, ARG.PA | Argan US engineering vs French property issuer.  AGX.US: ISIN US04010E1091, LEI 529900E4KZWBV9KGBS83, CIK 0000100591; ARG.PA: ISIN FR0010481960 |
| NNBR.US, NN.AS | NN industrial vs NN Group insurance issuer.  NNBR.US: ISIN US6293371067, LEI 549300SU3TUM6VH84645, CIK 0000918541; NN.AS: ISIN NL0010773842, LEI 724500OHYNDT9OY6Q215 |
| NSRGY.US, NESTLEIND.NSE | Nestle SA parent and separately listed Nestle India; parent-name exact search is not an identity merge. [Source](https://www.nestle.in/investors) NSRGY.US: ISIN US6410694060, LEI KY37LUS27QQX7BB93L28; NESTLEIND.NSE:  |
| BABA.US, 0241.HK | Alibaba Group and separately listed Alibaba Health; distinct legal issuers. [Source](https://www.alihealth.cn/) BABA.US: ISIN US01609W1027, LEI 5493001NTNQJDH60PM02, CIK 0001577552; 0241.HK: ISIN BMG0171K1018 |

## Retired baseline dossiers

These 35 IDs belonged to the 3,860-company coverage baseline. Each is retained as an alias and a 308 redirect; its canonical dossier numbers are unchanged. The other 23 retired IDs were coverage additions.

| Baseline ID | Canonical |
|---|---|
| 2015.HK | LI.US |
| 600938.SHG | 0883.HK |
| 600941.SHG | 0941.HK |
| 6690.HK | 600690.SHG |
| 688981.SHG | 0981.HK |
| 9888.HK | BIDU.US |
| 9988.HK | BABA.US |
| 9999.HK | NTES.US |
| ABVX.PA | ABVX.US |
| AGN.AS | AEG.US |
| AMC.AU | AMCR.US |
| BDRFY.US | BEI.XETRA |
| BH-A.US | BH.US |
| FEMSAUBD.MX | FMX.US |
| FFH.TO | FRFHF.US |
| FME.XETRA | FMS.US |
| FWONA.US | FWONK.US |
| GLIBK.US | GLIBA.US |
| HEN3.XETRA | HEN.XETRA |
| HESAY.US | RMS.PA |
| HKLB.LSE | HKHGF.US |
| HXGBY.US | HEXA-B.ST |
| ING.US | INGA.AS |
| ITUB3.SA | ITUB.US |
| JHX.AU | JHX.US |
| NESN.SW | NSRGY.US |
| NWS.AU | NWS.US |
| NXG.AU | NXE.US |
| RTO.US | RTO.LSE |
| SN.LSE | SNN.US |
| UA.US | UAA.US |
| VESTA.MX | VTMX.US |
| VOW3.XETRA | VOW.XETRA |
| Z.US | ZG.US |
| ZTO.US | 2057.HK |
