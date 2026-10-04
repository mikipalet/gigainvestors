import {it,expect} from 'vitest';
import {NextRequest} from 'next/server';
import {proxy} from '@/proxy';
it('keeps agent discovery reachable on the value website host',async()=>{
 const response=await proxy(new NextRequest('https://value.gigainvestors.com/.well-known/x402'));
 expect(response.status).toBe(308);
 expect(response.headers.get('location')).toBe('https://gigainvestors.com/.well-known/x402');
});
