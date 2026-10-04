import {createServer} from 'node:net';
import type {AddressInfo} from 'node:net';
import {afterEach,expect,it} from 'vitest';
import {fetchEsef} from '@/lib/value/reports/esef';
import {fetchEdgar} from '@/lib/value/reports/edgar';
const servers:ReturnType<typeof createServer>[]=[];
afterEach(async()=>{for(const s of servers.splice(0))await new Promise<void>(r=>s.close(()=>r()));});
for(const [name,fetcher]of [['ESEF',fetchEsef],['SEC',fetchEdgar]] as const){
 it(name+' retries a truncated report body before returning a complete buffered response',async()=>{
  let calls=0;
  const s=createServer(socket=>socket.once('data',()=>{calls++;socket.end(calls===1?'HTTP/1.1 200 OK\r\nContent-Length: 100000\r\nConnection: close\r\n\r\ntruncated':'HTTP/1.1 200 OK\r\nContent-Length: 6\r\nConnection: close\r\n\r\nreport');}));servers.push(s);
  await new Promise<void>(r=>s.listen(0,'127.0.0.1',r));
  const response=await fetcher(`http://127.0.0.1:${(s.address() as AddressInfo).port}/`);
  expect(await response.text()).toBe('report');expect(calls).toBe(2);
 });
}
it('fully drains a closing 128KB response before the caller starts reading',async()=>{
 const body='a'.repeat(128*1024);
 const s=createServer(socket=>socket.once('data',()=>socket.end(`HTTP/1.1 200 OK\r\nContent-Length: ${body.length}\r\nConnection: close\r\n\r\n${body}`)));servers.push(s);
 await new Promise<void>(r=>s.listen(0,'127.0.0.1',r));
 const response=await fetchEsef(`http://127.0.0.1:${(s.address() as AddressInfo).port}/`);
 expect(await response.text()).toBe(body);
});
