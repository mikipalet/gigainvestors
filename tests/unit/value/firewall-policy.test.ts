import {expect,it} from 'vitest';
import {firewallRules,exclusions} from '../../../scripts/protection/firewall-policy.mjs';
it('exempts paid and agent discovery routes with explicit boundaries',()=>{
 const excluded=new RegExp(exclusions);
 for(const p of ['/api/v1','/api/v1/value/search','/llms.txt','/llms-full.txt','/foo.md','/robots.txt','/sitemap.xml','/sitemaps/value.xml','/mcp','/mcp.json','/md/value/ko.us','/value/robots.txt'])expect(excluded.test(p),p).toBe(true);
 for(const p of ['/','/ko.us','/value/ko.us','/data/v/meta.json','/api/v10','/mcp-other'])expect(excluded.test(p),p).toBe(false);
});
it('limits only data in challenge mode, keeps pages log-only and uses no paid bot condition or UA match',()=>{
 const rules=firewallRules('production');
 expect(rules[1].conditionGroup[0].conditions).toContainEqual({type:'path',op:'pre',value:'/data/v/'});
 expect(rules[1].action.mitigate.rateLimit).toEqual({algo:'fixed_window',window:60,limit:120,keys:['ip'],action:'challenge'});
 expect(rules[2].action.mitigate.rateLimit.action).toBe('log');
 expect(rules[3].conditionGroup[0].conditions).toContainEqual({type:'path',op:'pre',value:'/data/v/',neg:true});
 expect(rules[3].action.mitigate.action).toBe('bypass');
 expect(JSON.stringify(rules)).not.toMatch(/bot_status|user_agent/);
 expect(firewallRules('production','deny')[1].action.mitigate.rateLimit).toMatchObject({limit:600,action:'deny'});
});
