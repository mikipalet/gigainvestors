import {describe,it,expect} from 'vitest';
import {siteUrl, markdownUrl, pageAlternates} from '@/lib/agents/urls';
import {robotsPolicy} from '@/lib/agents/robots';
import {methodMarkdown, methodSummary} from '@/lib/agents/method';
import {companyMarkdown} from '@/lib/agents/company';
import {packView} from '@/lib/value/browser-view';
import {checklistMarkdown} from '@/lib/agents/checklist';
import {schemaJson} from '@/lib/agents/schema';

describe('agent discovery contracts',()=>{
 it('keeps existing canonical domains and quarter queries in markdown links',()=>{
  expect(siteUrl('value','/ko.us')).toBe('https://value.gigainvestors.com/ko.us');
  expect(markdownUrl(siteUrl('value','/?q=2018Q3'))).toBe('https://value.gigainvestors.com/index.md?q=2018Q3');
  expect(pageAlternates('main','/BRK').types['text/markdown']).toBe('https://gigainvestors.com/BRK.md');
 });
 it('allows AI content without losing expensive-path exclusions in specific groups',()=>{
  const policy=robotsPolicy('value');
  for(const rule of policy.rules){expect(rule.allow).toContain('/');expect(rule.disallow).toContain('/api/');}
  expect(policy.rules.flatMap(r=>r.userAgent)).toContain('ClaudeBot');
  expect(policy.sitemap).toBe('https://value.gigainvestors.com/sitemap.xml');
 });
 it('exports the method and its live numerical cutoffs',()=>{
  expect(methodSummary).toHaveLength(10);
  expect(methodMarkdown()).toContain('Every numerical cutoff');
  expect(methodMarkdown()).toContain('survivorship');
 });
 it('escapes JSON-LD script termination',()=>{
  expect(schemaJson({name:'</script><script>alert(1)</script>'})).not.toContain('</script>');
  expect(JSON.parse(schemaJson({name:'<company>'}))).toEqual({name:'<company>'});
 });
});
