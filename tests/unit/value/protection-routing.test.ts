import {expect,it} from 'vitest';
import {unstable_doesMiddlewareMatch} from 'next/experimental/testing/server';
import {config} from '@/proxy';
it('does not invoke proxy for CDN data hits or BotID challenge rewrites',()=>{
 for(const path of ['/data/v/meta.json','/149e9513-01fa-4fb0-aad4-566afd725d1b/2d206a39-8ed7-437e-a3be-862e0f06eea3/a-4-a/c.js']){
  expect(unstable_doesMiddlewareMatch({config,nextConfig:{},url:'https://value.gigainvestors.com'+path,headers:{host:'value.gigainvestors.com'}})).toBe(false);
 }
});
