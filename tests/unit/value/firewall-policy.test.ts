import {expect,it} from 'vitest';
import {firewallRules,exclusions} from '../../../scripts/protection/firewall-policy.mjs';
it('exempts paid and agent discovery routes with explicit boundaries',()=>{
 const excluded=new RegExp(exclusions);
 for(const p of ['/api/v1','/api/v1/value/search','/llms.txt','/llms-full.txt','/foo.md','/robots.txt','/sitemap.xml','/sitemaps/value.xml','/mcp','/mcp.json','/md/value/ko.us','/value/robots.txt'])expect(excluded.test(p),p).toBe(true);
 for(const p of ['/','/ko.us','/value/ko.us','/data/v/meta.json','/api/v10','/mcp-other'])expect(excluded.test(p),p).toBe(false);
});
it('places verified identity before IP limits and leaves preview in log mode',()=>{
 const rules=firewallRules();expect(rules[1].conditionGroup[0].conditions).toContainEqual({type:'bot_status',op:'eq',value:'verified'});
 expect(rules[2].action.mitigate.rateLimit).toEqual({algo:'fixed_window',window:60,limit:120,keys:['ip'],action:'log'});
 expect(firewallRules('production','challenge')[2].action.mitigate.rateLimit.action).toBe('challenge');
});
