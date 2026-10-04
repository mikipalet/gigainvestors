import {expect,it} from 'vitest';
import {annualInlineFacts} from '@/lib/value/annual-inline';
const html=`<xbrli:context id="all"><xbrli:period><xbrli:startDate>2025-01-01</xbrli:startDate><xbrli:endDate>2025-12-31</xbrli:endDate></xbrli:period></xbrli:context><xbrli:context id="part"><xbrli:entity><xbrli:segment><xbrldi:explicitMember dimension="srt:ConsolidatedEntitiesAxis">issuer:GroupMember</xbrldi:explicitMember></xbrli:segment></xbrli:entity><xbrli:period><xbrli:startDate>2025-01-01</xbrli:startDate><xbrli:endDate>2025-12-31</xbrli:endDate></xbrli:period></xbrli:context><xbrli:unit id="usd"><xbrli:measure>iso4217:USD</xbrli:measure></xbrli:unit><xbrli:unit id="shares"><xbrli:measure>xbrli:shares</xbrli:measure></xbrli:unit><ix:nonFraction name="us-gaap:Revenues" unitRef="usd" contextRef="all" scale="6">18,481</ix:nonFraction><ix:nonFraction name="us-gaap:WeightedAverageNumberOfDilutedSharesOutstanding" unitRef="shares" contextRef="part" scale="6">258</ix:nonFraction>`;
const meta={url:'https://sec.gov/annual',filed:'2026-02-11',form:'10-K'};
it('preserves inline scale and excludes segment facts by default',()=>{const f=annualInlineFacts(html,meta);expect(f.facts['us-gaap'].Revenues.units.USD[0].val).toBe(18481000000);expect(f.facts['us-gaap'].WeightedAverageNumberOfDilutedSharesOutstanding).toBeUndefined();});
it('accepts only the explicitly evidenced tracking-group dimension set',()=>{const f=annualInlineFacts(html,{...meta,shareDimensions:{'srt:ConsolidatedEntitiesAxis':'issuer:GroupMember'}});expect(f.facts['us-gaap'].WeightedAverageNumberOfDilutedSharesOutstanding.units.shares[0].val).toBe(258000000);});
it('retains a reviewed issuer revenue concept but does not import arbitrary extensions',()=>{
 const source=html.replace('us-gaap:Revenues','issuer:ConsolidatedRevenue');
 const f=annualInlineFacts(source,{...meta,revenueConcept:'issuer:ConsolidatedRevenue'});
 expect(f.facts.issuer.ConsolidatedRevenue.units.USD[0].val).toBe(18481000000);
 expect(annualInlineFacts(source,meta).facts.issuer).toBeUndefined();
});
it('selects an explicit accounting basis for revenue without mixing the undimensioned alternative',()=>{
 const source=html+'<ix:nonFraction name="us-gaap:Revenues" unitRef="usd" contextRef="part" scale="6">23,035</ix:nonFraction>';
 const f=annualInlineFacts(source,{...meta,revenueConcept:'us-gaap:Revenues',revenueDimensions:{'srt:ConsolidatedEntitiesAxis':'issuer:GroupMember'}});
 expect(f.facts['us-gaap'].Revenues.units.USD.map(x=>x.val)).toEqual([23035000000]);
});
