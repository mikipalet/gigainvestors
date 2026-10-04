import {expect,it} from 'vitest';
import {unstable_doesMiddlewareMatch} from 'next/experimental/testing/server';
import {config} from '@/proxy';
it('does not invoke proxy for CDN data hits',()=>{
 for(const path of ['/data/v/meta.json','/data/v/views/0123456789abcdef01234567.json']){
  expect(unstable_doesMiddlewareMatch({config,nextConfig:{},url:'https://value.gigainvestors.com'+path,headers:{host:'value.gigainvestors.com'}})).toBe(false);
 }
});
