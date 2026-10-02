import {it,expect} from 'vitest';
import {parseEcbYield} from '../../../lib/value/bond-yields';
const csv=(country='IE',period='2026-08',value='3.35',unit='PC')=>`KEY,FREQ,REF_AREA,MATURITY_CAT,CURRENCY_TRANS,TIME_PERIOD,OBS_VALUE,UNIT,UNIT_MULT\nIRS.M.${country}.L.L40.CI.0000.EUR.N.Z,M,${country},CI,EUR,${period},${value},${unit},0`;
it('validates ECB country, ten-year tenor, percent units and monthly freshness',()=>{
 expect(parseEcbYield(csv(),'IE','2026-10-02')).toEqual({yield:.0335,observedAt:'2026-08-31'});
 expect(parseEcbYield(csv('DE'),'IE','2026-10-02')).toBeNull();
 expect(parseEcbYield(csv('IE','2026-01'),'IE','2026-10-02')).toBeNull();
 expect(parseEcbYield(csv('IE','2026-11'),'IE','2026-10-02')).toBeNull();
 expect(parseEcbYield(csv('IE','2026-08','335'),'IE','2026-10-02')).toBeNull();
 expect(parseEcbYield(csv('IE','2026-08','3.35','EUR'),'IE','2026-10-02')).toBeNull();
});
