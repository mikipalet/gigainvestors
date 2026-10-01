/** Primary-source corporate actions whose economics continue across legal IDs. */
export const issuerPredecessors:Record<string,{id:string;through:string;source:string;quote:string}>={
 '5831.JP':{id:'8355.JP',through:'2022-03-31',source:'https://www.shizuokabank.co.jp/english/pdf/integrated_report_2022.pdf',quote:'Share transfer ratio: Shizuoka Financial Group 1; The Shizuoka Bank 1.'},
 '9147.JP':{id:'9062.JP',through:'2021-12-31',source:'https://www.nipponexpress-holdings.com/en/pdf/ir/event/meetings/115th-ordinary-general-meeting-of-shareholders.pdf',quote:'one share of Holding Company common stock for each share of Company common stock'},
};
export const issuerSplits:Record<string,Array<{date:string;factor:number;source:string}>>={
 'PDN.AU':[{date:'2024-04-09',factor:0.1,source:'https://www.aspecthuntley.com.au/asxdata/20240829/pdf/02845775.pdf'}],
 'GGP.AU':[{date:'2025-06-20',factor:0.05,source:'https://announcements.asx.com.au/asxpdf/20250925/pdf/06pnb20dpfjcdb.pdf'}],
 '6526.JP':[{date:'2024-01-01',factor:5,source:'https://www.socionext.com/en/ir/pdf/sn_ir20240130_02e.pdf'}],
 '9843.JP':[{date:'2025-10-01',factor:5,source:'https://www.nitorihd.co.jp/en/ir/performance/indicator.html'}],
};
/** Real capital issuance must remain in dilution tests, rather than erasing
 * the earlier operating record as though the share change were a data error. */
export const issuerCapitalChanges:Record<string,Array<{fy:number;throughFy?:number;source:string;quote:string;cancelledCommon?:boolean}>>={
 'ROSE.LSE':[{fy:2025,source:'https://cdn.yano.digital/media/upqnplx1/8419-rosebank-ar25-web.pdf',quote:'On 3 July 2025, 386,607,653 shares were issued of nil par value for 300 pence each, to finance the acquisition of ECI'}],
 '000877.SHE':[{fy:2021,source:'https://money.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=7625061&stockid=000877',quote:'本次发行新增股份上市数量为 7,300,082,968股，上市时间为2021年11月2日。'}],
 'NAS.OL':[{fy:2020,throughFy:2021,source:'https://www.norwegian.no/globalassets/ip/documents/about-us/company/investor-relations/preferential-rights/nas---may-2021-registration-document.pdf',quote:'The recapitalization combines a 100:1 reverse split with creditor debt conversion and new equity; the 2021 annual report records 888,769,130 new shares issued.'}],
 'BMPS.MI':[{fy:2022,throughFy:2023,source:'https://gruppomps.it/static/upload/bmp/bmps-cb2---prospectus-02-07-2024.pdf',quote:'The capital increase was completed on 4 November 2022 through the issue of 1,249,665,648 new shares.'}],
 'EXE.US':[{fy:2021,source:'https://investors.expandenergy.com/news-releases/news-release-details/chesapeake-energy-corporation-successfully-emerges-financial',quote:'Chesapeake successfully emerged from its financial restructuring process on February 9, 2021; existing common stock was cancelled.',cancelledCommon:true}],
};
