import {afterEach,expect,it,vi} from 'vitest';
vi.mock('botid/server',()=>({checkBotId:vi.fn()}));
import {checkBotId} from 'botid/server';
import {checkDataBot} from '@/lib/value/bot-protection';
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
const request=new Request('https://test/data/v/meta.json');
it('allows humans, verified crawlers and WAF-invited agents',async()=>{
 vi.stubEnv('VERCEL','1');
 for(const result of [{isBot:false},{isBot:true,isVerifiedBot:true},{isBot:true,bypassed:true}]){
  vi.mocked(checkBotId).mockResolvedValue({isHuman:false,isVerifiedBot:false,bypassed:false,...result});
  expect(await checkDataBot(request)).toBeNull();
 }
 expect(checkBotId).toHaveBeenCalledWith(expect.objectContaining({advancedOptions:expect.objectContaining({checkLevel:'basic'})}));
});
it('never caches bot denials or verification failures',async()=>{
 vi.stubEnv('VERCEL','1');
 vi.mocked(checkBotId).mockResolvedValue({isBot:true,isHuman:false,isVerifiedBot:false,bypassed:false});
 const denied=await checkDataBot(request);expect(denied?.status).toBe(403);expect(denied?.headers.get('cache-control')).toBe('no-store');
 vi.mocked(checkBotId).mockRejectedValue(new Error('secret'));const unavailable=await checkDataBot(request);expect(unavailable?.status).toBe(503);expect(await unavailable?.text()).not.toContain('secret');
});
