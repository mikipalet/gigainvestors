import {it,expect,vi} from 'vitest';
import {GET} from '@/app/md/s/[ticker]/route';
import {companyAlternates,siteUrl} from '@/lib/agents/urls';
vi.mock('@/lib/data',()=>({getIndex:vi.fn(async()=>null),getStock:vi.fn(async()=>null)}));
vi.mock('@/lib/value/store',()=>({getDossier:vi.fn(async()=>({id:'7203.JP',company:{name:'Toyota',country:'JP'}})),getPrice:vi.fn(async()=>null),readStore:vi.fn(async()=>[['7203.JP','PPFPP',null,false,null,{price:100}]])}));
vi.mock('@/lib/agents/company',()=>({companyMarkdown:vi.fn(()=> '# Toyota current dossier')}));
vi.mock('@/lib/agents/holder-observations',()=>({holderObservations:vi.fn(async()=> 'No tracked holders')}));
it('serves foreign company markdown without a 13F stock record',async()=>{
 const r=await GET(new Request('https://gigainvestors.com/s/7203.JP.md'),{params:Promise.resolve({ticker:'7203.JP'})});
 expect(r.status).toBe(200);expect(await r.text()).toContain('Toyota current dossier');expect(r.headers.get('Link')).toContain('https://gigainvestors.com/s/7203.JP');
});
it('serves only the selected historical checklist observation',async()=>{
 const r=await GET(new Request('https://gigainvestors.com/s/7203.JP.md?q=2018Q3'),{params:Promise.resolve({ticker:'7203.JP'})});
 const body=await r.text();expect(body).toContain('2018Q3');expect(body).toContain('PPFPP');expect(body).not.toContain('current dossier');
});
it('uses unified company and checklist alternates',()=>{
 expect(companyAlternates('aapl.us')).toEqual({canonical:'https://gigainvestors.com/s/AAPL',types:{'text/markdown':'https://gigainvestors.com/s/AAPL.md'}});
 expect(siteUrl('value')).toBe('https://gigainvestors.com/value');
});
