import {expect,it} from 'vitest';
import {yearsFromScreener} from '@/lib/value/completeness/screener';
const table=(id:string,rows:string)=>`<section id="${id}"><table><tr><th></th><th>Mar 2025</th><th>TTM</th></tr>${rows}</table></section>`;
const row=(label:string,n:string)=>`<tr><td>${label}</td><td>${n}</td><td>999</td></tr>`;
it('normalizes crore totals, keeps EPS in rupees, derives EBIT and uses cash capex rather than net investing cash',()=>{
 const html='Consolidated Figures in Rs. Crores'+table('profit-loss',row('Sales +','100')+row('Operating Profit','30')+row('Depreciation','5')+row('Net Profit +','20')+row('EPS in Rs','10'))+table('balance-sheet',row('Equity Capital','2')+row('Reserves','48')+row('Borrowings +','10')+row('Total Assets','100'))+table('cash-flow',row('Cash from Operating Activity +','25')+row('Cash from Investing Activity +','-30'));
 const ys=yearsFromScreener(html,{'Cash from Investing Activity':{'Fixed assets purchased':{'Mar 2025':'-4'}},'Other Assets':{'Cash Equivalents':{'Mar 2025':'5'}}},'https://www.screener.in/company/X/consolidated/');
 expect(ys).toHaveLength(1);expect(ys[0]).toMatchObject({end:'2025-03-31',currency:'INR',revenue:1e9,operatingIncome:25e7,netIncome:20e7,capex:4e7,equity:50e7,basicEps:10,dilutedShares:2e7,cash:5e7});
 expect(ys[0].provenance?.capex?.source).toContain('screener.in');
});
it('leaves absent capex unknown and rejects tables without rupee-crore units',()=>{
 const html='Consolidated Figures in Rs. Crores'+table('profit-loss',row('Net Profit','20'));
 expect(yearsFromScreener(html,{},'https://example.com')[0].capex).toBeNull();
 expect(()=>yearsFromScreener(html.replace('Rs. Crores','dollars'),{},'https://example.com')).toThrow();
});
