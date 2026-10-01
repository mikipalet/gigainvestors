import {expect,it} from 'vitest';
import {nonOperatingReason} from '@/lib/value/fund-exclusion';
it('excludes funds and SPACs using type, category and names',()=>{
 for(const name of ['Bankers Investment Trust','Schiehallion Fund Ltd','TwentyFour Income Fund','BlackRock Capital Trust','Acme Income Trust','Acme Acquisition Corp']) expect(nonOperatingReason({name})).toBeTruthy();
 expect(nonOperatingReason({name:'Portfolio plc'},{Type:'ETF'})).toBeTruthy();
 expect(nonOperatingReason({name:'Portfolio plc'},{Category:'Closed End Funds'})).toBeTruthy();
});
it('keeps operating managers and property owners',()=>{
 for(const name of ['Jupiter Fund Management plc','Brookfield Asset Management','Goodman Property Trust','CapitaLand Ascendas REIT','Capital One Financial']) expect(nonOperatingReason({name,industry:'Asset Management'})).toBeNull();
});
it('does not confuse property REITs or businesses serving funds with investment funds',()=>{
 expect(nonOperatingReason({name:'Link Real Estate Investment Trust'})).toBeNull();
 expect(nonOperatingReason({name:'Federal Realty Investment Trust',industry:'REIT - Retail'})).toBeNull();
 expect(nonOperatingReason({name:'CoStar Group'},{Description:'CoStar provides services to investment trusts.'})).toBeNull();
 expect(nonOperatingReason({name:'Taiwan Financial'},{Description:'The company offers investment trust and banking services.'})).toBeNull();
 expect(nonOperatingReason({name:'AVI Global Trust'},{Description:'AVI Global Trust plc is a closed-ended equity mutual fund.'})).toBeTruthy();
});
it('uses a corroborated fund directory without removing operating asset managers',()=>{
 for(const name of ['3i Infrastructure','BH Macro','RIT Capital Partners','Baillie Gifford US Growth Trust','Personal Assets Trust','Worldwide Healthcare Trust','Vietnam Enterprise Investments']) expect(nonOperatingReason({name})).toBeTruthy();
 for(const name of ['Jupiter Fund Management plc','Foresight Group','Ashmore Group','Man Group','Supermarket Income REIT']) expect(nonOperatingReason({name})).toBeNull();
});
