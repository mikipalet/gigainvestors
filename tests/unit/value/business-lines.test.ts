import {it,expect} from 'vitest';
import {relationAmount} from '../../../lib/value/flags/presentation';
it('attributes a supplier revenue percentage to that supplier on the customer dossier',()=>{
 const r={from:'SWKS.US',to:'AAPL.US',name:'Skyworks',percent:.67,metric:'revenue'} as Parameters<typeof relationAmount>[0];
 expect(relationAmount(r,'AAPL.US')).toBe('67% of Skyworks revenue');
 expect(relationAmount({...r,name:'Apple'},'SWKS.US')).toBe('67% revenue');
});
