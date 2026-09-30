import { auditShares } from '../audit-shares';
/** Source observations and residuals stay in the private corpus. */
export default async function checks(options:{only?:string[];limit?:number}={}) {
  await auditShares(undefined,options);
}
