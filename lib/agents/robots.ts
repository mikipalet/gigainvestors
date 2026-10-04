import {siteUrl, type Site} from './urls';
export function robotsPolicy(site: Site) {
  // Specific agent groups must repeat exclusions: robots groups do not inherit '*'.
  const disallow = ['/api/', '/_next/image', '/unsubscribe', '/mcp$'];
  const allow = ['/', '/api/v1/openapi.json'];
  return {
    rules: [
      {userAgent: '*', allow, disallow},
      {userAgent: ['GPTBot','OAI-SearchBot','ChatGPT-User','ClaudeBot','Claude-SearchBot','Claude-User','PerplexityBot','Perplexity-User','Google-Extended','Googlebot','Bingbot','Amazonbot','Applebot-Extended'], allow, disallow},
    ],
    sitemap: siteUrl('main', '/sitemap.xml'), host: siteUrl('main').replace(/\/$/, ''),
  };
}
