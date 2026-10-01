import {it,expect} from 'vitest';
import {inlineObservations} from '../../../lib/value/flags/inline';
const meta={url:'https://www.sec.gov/Archives/a.htm',filed:'2026-02-01',period:'2025-12-31'};
const context=(id:string,segment=false)=>`<xbrli:context id="${id}"><xbrli:entity><xbrli:identifier>1</xbrli:identifier>${segment?'<xbrli:segment><xbrldi:explicitMember>Cloud</xbrldi:explicitMember></xbrli:segment>':''}</xbrli:entity><xbrli:period><xbrli:startDate>2025-01-01</xbrli:startDate><xbrli:endDate>2025-12-31</xbrli:endDate></xbrli:period></xbrli:context>`;
it('reads scaled consolidated annual facts and rejects segment facts',()=>{
 const html=`<html><xbrli:unit id="usd"><xbrli:measure>iso4217:USD</xbrli:measure></xbrli:unit>${context('annual')}${context('segment',true)}<table><tr><td>Purchases of property</td><td><ix:nonFraction name="us-gaap:PaymentsToAcquirePropertyPlantAndEquipment" contextRef="annual" unitRef="usd" scale="6">240</ix:nonFraction></td></tr><tr><td>Revenue</td><td><ix:nonFraction name="us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax" contextRef="segment" unitRef="usd" scale="6">500</ix:nonFraction></td></tr></table></html>`;
 const observations=inlineObservations(html,meta);
 expect(observations.find(o=>o.metric==='capex')).toMatchObject({value:240000000,fy:2025,currency:'USD',evidence:{quote:'Purchases of property 240'}});
 expect(observations.some(o=>o.metric==='revenue')).toBe(false);
});
it('does not silently choose between inconsistent duplicate observations',()=>{
 const html=`<html>${context('annual')}<xbrli:unit id="usd"><xbrli:measure>iso4217:USD</xbrli:measure></xbrli:unit>${[100,200].map(n=>`<tr><td><ix:nonFraction name="us-gaap:Depreciation" contextRef="annual" unitRef="usd">${n}</ix:nonFraction></td></tr>`).join('')}</html>`;
 expect(inlineObservations(html,meta).filter(o=>o.metric==='depreciation')).toEqual([]);
});
it('reconciles a rounded narrative duplicate with a precise table fact',()=>{
 const html=`<html>${context('annual')}<xbrli:unit id="usd"><xbrli:measure>iso4217:USD</xbrli:measure></xbrli:unit>${[['2.4',9,-8],['2440',6,-6]].map(([n,scale,decimals])=>`<tr><td>Depreciation <ix:nonFraction name="us-gaap:Depreciation" contextRef="annual" unitRef="usd" scale="${scale}" decimals="${decimals}">${n}</ix:nonFraction></td></tr>`).join('')}</html>`;
 expect(inlineObservations(html,meta).find(o=>o.metric==='depreciation')?.value).toBe(2440e6);
});
