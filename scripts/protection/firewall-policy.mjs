// Vercel WAF API custom-rule payloads. Printed output contains no credentials.
// Controller stages these in order; review the draft before publishing it.
export const exclusions = '^/(?:api/v1(?:/|$)|api/value/revalidate(?:/|$)|\\.well-known/x402(?:/|$)|(?:value/)?(?:llms(?:-full)?\\.txt|robots\\.txt|sitemap\\.xml|sitemaps(?:/|$)|mcp(?:\\.json)?(?:/|$)|md(?:/|$)))|\\.md$';
const condition = (type, op, value, extra = {}) => ({type, op, value, ...extra});
const group = (...conditions) => ({conditions});
const rule = (name, conditionGroup, mitigate) => ({name, active: true, conditionGroup, action: {mitigate}});
export function firewallRules(environment = 'preview', action = 'challenge') {
  if (!['preview', 'production'].includes(environment) || !['log', 'challenge', 'deny'].includes(action)) throw Error('Invalid firewall mode');
  const env = condition('environment', 'eq', environment);
  const rate = (action, limit) => ({action: 'rate_limit', rateLimit: {algo:'fixed_window', window:60, limit, keys:['ip'], action}});
  return [
    rule(`Value: agent and paid routes (${environment})`, [group(env, condition('path', 're', exclusions))], {action:'bypass'}),
    rule(`Value: data requests (${environment})`, [group(env, condition('path','pre','/data/v/'), condition('method','inc',['GET','HEAD']))], rate(action, action === 'deny' ? 600 : 120)),
    rule(`Value: page requests (${environment})`, [
      group(env, condition('path','re','^/(?:api|_next|faces|data)(?:/|$)',{neg:true}), condition('path','re',exclusions,{neg:true}), condition('path','re','\\.(?:css|js|map|png|jpe?g|svg|ico|webp|avif|gif|woff2?|json|txt|xml|pdf|webmanifest)$',{neg:true}), condition('method','inc',['GET','HEAD'])),
    ], rate('log',120)),
    // Managed Bot Protection is project-wide; keep enforcement on the data path.
    rule(`Value: non-data managed bypass (${environment})`, [group(env, condition('path','pre','/data/v/',{neg:true}))], {action:'bypass'}),
  ];
}
export const managedBotProtection = {action:'managedRules.update', id:'bot_filter', value:{active:true, action:'challenge'}};
if (process.argv[1]?.endsWith('firewall-policy.mjs')) console.log(JSON.stringify(firewallRules(process.argv[2], process.argv[3]), null, 2));
