/** Search names, not identity edges. Listed subsidiaries keep their own dossiers. */
export const issuerSearchNames:Record<string,string[]>={
 'NSRGY.US':['nestle'], 'NESN.SW':['nestle'], 'BABA.US':['alibaba'], '9988.HK':['alibaba'],
};
export const normalizedIssuerQuery=(s:string)=>s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim();
