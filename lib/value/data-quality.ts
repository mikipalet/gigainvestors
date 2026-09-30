/** Preserve valuation provenance and hold implausible comparisons for review. */
export function valuationFlags({price,mid,assumptions,cap,shares,usdRate,corroborated=false}: {price:number|null;mid:number|null;assumptions:string[];cap?:number|null;shares?:number|null;usdRate?:number|null;corroborated?:boolean}): string[] {
 const flags=assumptions.filter(note=>/share count corrected|share sources disagree|share count not corrected|unverified/i.test(note));
 const verified=corroborated||assumptions.some(note=>note.startsWith('Share count verified within 2%:'));
 if(!verified&&price!==null&&mid!==null&&mid>0&&(price/mid<.2||price/mid>20))flags.push('Unverified ratio: price / value is outside 0.2×–20×');
 if(!verified&&cap&&price&&shares&&usdRate&&Math.abs(cap/(price*shares*usdRate)-1)>.02)flags.push('Market cap and price × shares differ by more than 2%; dates or share basis need verification');
 return [...new Set(flags)];
}
