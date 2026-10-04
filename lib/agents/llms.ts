import {VALUE_PRODUCT_NAME} from '@/lib/value/brand';
import {pageCatalog} from './catalog';
import {methodMarkdown,methodSummary} from './method';
import {siteUrl,markdownUrl,apiUrl,type Site} from './urls';
export async function llmsText(site: Site,full=false) {
 const {index,meta,pages,valuePages}=await pageCatalog(site);
 const title=site==='value'?VALUE_PRODUCT_NAME:'GigaInvestors';
 const intro=[`# ${title}`,
 '> Published investor holdings and evidence-backed company checklists. Use dated observations, original filings and the method to interpret each result.',
 'Method in 10 lines:\n'+methodSummary.map((line,i)=>`${i+1}. ${line}`).join('\n'),
 'Reading a verdict: Buy now requires all five quality passes, the published buy-price discount and the annual return hurdle. Wait is not a buy. A failed quality test cannot be repaired by a lower price. Model estimates are not guarantees or investment advice.',
 `Freshness: investor publication ${index?.generatedAt??'see investor page'}; latest holding quarter ${index?.quarters.at(-1)??'see investor page'}. Checklist publication ${meta?.asOf??'see company page'}. Always cite the separate quote, analysis, fiscal-period and filing dates. 13F holdings lag quarter end; prices are not a real-time feed.`,
 'Sources and licensing: SEC 13F filings via Dataroma; company statements via SEC EDGAR, EDINET, ESEF, EODHD and Yahoo. Cite the original filing and canonical GigaInvestors URL. Underlying third-party licenses apply; public access grants no blanket right to redistribute source datasets.',
 'Historical checklist frames use current restatements and today’s surviving index membership (survivorship bias). Price changes exclude dividends; overlapping cohorts are not a tradable portfolio.',
 '## Key pages',
 `- [Investor map](${markdownUrl(siteUrl('main'))}): holdings and portfolio values.`,
 `- [Checklist](${markdownUrl(siteUrl('value'))}): quality passes and current prices.`,
 `- [Method and glossary](${markdownUrl(siteUrl('value','/method'))}): rules, thresholds, versions and caveats.`,
 `- [Full method and page index](${siteUrl(site,'/llms-full.txt')}): expanded reference, generated from the published content.`,
 `- [Sitemap index](${siteUrl(site,'/sitemap.xml')}): canonical investor, company and quarter URLs.`,
 '## MCP',
 `- [MCP discovery document](${siteUrl(site,'/mcp.json')}): public, read-only, unauthenticated discovery; endpoint ${siteUrl(site,'/mcp')}. Streamable HTTP POST; tools search_companies, search_investors, get_company_summary, get_method. No paid detail tools.`,
 '## API',
 `- [Paid JSON API — INTEGRATION PLACEHOLDER (api-1 / merge-1)](${apiUrl()}): x402 details, payment requirements and OpenAPI discovery are owned by api-1. This section must be filled by api-1/merge-1; no paid API is implemented by the agent-ready work.`,
 '## Contact',
 '- [Contact GigaInvestors](mailto:hello@gigainvestors.com): corrections, provenance and licensing questions.',
 ];
 if(full)intro.push(methodMarkdown().replace(/^# /,'## '),'## Page index',...pages.map(p=>`- [${p.title}](${markdownUrl(p.url)}): canonical ${p.url}`),...(site==='main'?['## Checklist page index',...valuePages.map(p=>`- [${p.title}](${markdownUrl(p.url)}): canonical ${p.url}`)]:[]));
 return intro.join('\n\n')+'\n';
}
