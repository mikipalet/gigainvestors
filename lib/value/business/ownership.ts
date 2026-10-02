import type {MemoLine} from '../owner-memo';
/** Officer/director group disclosures take precedence over vendor insider totals.
 * Keep issuer wording for a bound rather than inventing precision from options. */
export function officerOwnership(id:string):MemoLine|undefined {
 if(id!=='KO.US')return undefined;
 return {question:5,answer:'Directors and executive officers own less than 1% of the company.',basis:'filing',evidence:[{
  url:'https://investors.coca-colacompany.com/filings-reports/all-sec-filings/content/0001104659-26-028215/ko-20260429xdef14a.htm',
  filed:'2026-03-16',section:'2026 proxy, page 44 — Directors and Executive Officers',
  quote:'All Directors, Director nominees and executive officers as a group (22 persons) 38,886,151. Less than 1% of outstanding shares of Common Stock.',
 }]};
}
