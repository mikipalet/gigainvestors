/** USDC has six decimals. This is the single authoritative price table. */
export const PRICES = { basic: 2_000, detail: 10_000, bulk: 50_000 } as const;
export const ROUTES = [
  { id:'search', path:'/search', price:'basic', description:'Search investors and companies' },
  { id:'investors', path:'/investors', price:'basic', description:'Investor directory and available quarters' },
  { id:'holdings', path:'/investors/{id}/holdings', price:'detail', description:'Derived portfolio weights, ranks and changes by quarter' },
  { id:'ownership', path:'/stocks/{id}/ownership', price:'detail', description:'Derived stock ownership by tracked investors and quarter' },
  { id:'companies', path:'/companies', price:'basic', description:'Company directory' },
  { id:'dossier', path:'/companies/{id}', price:'detail', description:'Company research dossier' },
  { id:'verdict', path:'/companies/{id}/verdict', price:'basic', description:'Five-test verdict and price decision' },
  { id:'memo', path:'/companies/{id}/memo', price:'detail', description:'Business memo' },
  { id:'priceStory', path:'/companies/{id}/price-story', price:'detail', description:'Price story and computed metrics' },
  { id:'checklists', path:'/checklists', price:'basic', description:'Buy now, next closest, or all companies with filters' },
  { id:'history', path:'/time-travel', price:'bulk', description:'Available quarters and since-return summaries' },
  { id:'quarter', path:'/time-travel/{quarter}', price:'bulk', description:'Quarterly checklist and since-return summary' },
  { id:'export', path:'/export', price:'bulk', description:'Bulk derived checklist export, up to 10000 rows per call' },
  { id:'method', path:'/method', price:'basic', description:'Methodology and numerical rules' },
  { id:'changelog', path:'/changelog', price:'basic', description:'Published method changelog' },
  { id:'forward', path:'/forward', price:'basic', description:'Forward record and derived returns' },
] as const;
export type Route = typeof ROUTES[number];
export type RouteId = Route['id'];
export function resolveRoute(pathname:string):Route|undefined {
 return ROUTES.find(r=>new RegExp('^/api/v1'+r.path.replace(/\{[^}]+\}/g,'[^/]+')+'/?$').test(pathname));
}
export const FREE_PATHS = ['/api/v1','/api/v1/openapi.json','/api/v1/pricing','/api/v1/guide','/.well-known/x402'];
export type PaymentConfig={payTo:string;network:'eip155:84532'|'eip155:8453';facilitatorUrl:string};
export function paymentConfig(env:Record<string,string|undefined>=process.env):PaymentConfig {
 const network=env.X402_NETWORK??'eip155:84532';
 if(network!=='eip155:84532'&&network!=='eip155:8453')throw new Error('X402_NETWORK must be eip155:84532 or eip155:8453');
 const payTo=env.X402_PAY_TO;
 if(!payTo||!/^0x[\da-fA-F]{40}$/.test(payTo)||/^0x0{40}$/.test(payTo))throw new Error('Set X402_PAY_TO to the owner supplied receiving address');
 const facilitatorUrl=env.X402_FACILITATOR_URL??(network==='eip155:8453'?'https://api.cdp.coinbase.com/platform/v2/x402':'https://x402.org/facilitator');
 if(!facilitatorUrl.startsWith('https://'))throw new Error('Facilitator must use HTTPS');
 return {payTo,network,facilitatorUrl};
}
export function pricing() {
 return {currency:'USDC',decimals:6,network:process.env.X402_NETWORK??'eip155:84532',configured:Boolean(process.env.X402_PAY_TO),routes:ROUTES.map(r=>({...r,path:'/api/v1'+r.path,amount:String(PRICES[r.price]),usd:(PRICES[r.price]/1e6).toFixed(3)}))};
}
