import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('next/cache',()=>({revalidateTag:vi.fn()}));
import { revalidateTag } from 'next/cache';
import { POST } from '../../../app/api/value/revalidate/route';
import { revalidatePublishedValue } from '../../../scripts/value/revalidate';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.clearAllMocks();});
describe('value freshness webhook',()=>{
 it('rejects missing and wrong secrets without invalidating',async()=>{
  vi.stubEnv('VALUE_REVALIDATE_SECRET','private-test');
  for(const authorization of ['', 'Bearer wrong'])expect((await POST(new Request('https://test/api/value/revalidate',{method:'POST',headers:{authorization}}))).status).toBe(401);
  expect(revalidateTag).not.toHaveBeenCalled();
 });
 it('fails closed when the server has no secret',async()=>{
  vi.stubEnv('VALUE_REVALIDATE_SECRET','');
  expect((await POST(new Request('https://test/api/value/revalidate',{method:'POST'}))).status).toBe(503);
 });
 it('expires tagged value data immediately for an authenticated publisher',async()=>{
  vi.stubEnv('VALUE_REVALIDATE_SECRET','private-test');
  const response=await POST(new Request('https://test/api/value/revalidate',{method:'POST',headers:{authorization:'Bearer private-test'}}));
  expect(response.status).toBe(200);expect(revalidateTag).toHaveBeenCalledWith('value-data',{expire:0});
 });
 it('skips an unconfigured publisher and reports a failed invalidation',async()=>{
  vi.stubEnv('VALUE_REVALIDATE_URL','');vi.stubEnv('VALUE_REVALIDATE_SECRET','');
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch);await revalidatePublishedValue();expect(fetch).not.toHaveBeenCalled();
  vi.stubEnv('VALUE_REVALIDATE_URL','https://value.gigainvestors.com/api/value/revalidate');vi.stubEnv('VALUE_REVALIDATE_SECRET','private-test');
  fetch.mockResolvedValue(new Response('no',{status:401}));await expect(revalidatePublishedValue()).rejects.toThrow('401');
  fetch.mockResolvedValue(new Response('{}'));await revalidatePublishedValue();expect(fetch).toHaveBeenLastCalledWith(expect.any(String),expect.objectContaining({method:'POST',headers:{Authorization:'Bearer private-test'}}));
 });
});
