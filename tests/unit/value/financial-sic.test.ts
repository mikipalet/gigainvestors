import {expect,it} from 'vitest';
import {kindFor} from '@/lib/value/universe';
it('routes a regulatory life insurer through insurer valuation despite an asset-management vendor label',()=>{expect(kindFor({industry:'Asset Management',sector:'Financial Services',sic:'6311'})).toBe('insurer');});
it('keeps insurance brokerage operating and ignores invalid SIC values',()=>{expect(kindFor({industry:'Insurance Brokers',sector:'Financial Services',sic:'6411'})).toBe('operating');expect(kindFor({industry:'Asset Management',sector:'Financial Services',sic:''})).toBe('operating');});
