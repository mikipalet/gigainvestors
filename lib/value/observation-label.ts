import type {ProvisionalYear} from './quality-ltm';
export function observationLabel(fy:number,provisional?:ProvisionalYear):string {
 return provisional?.fy===fy?provisional.label:`FY${fy}`;
}
