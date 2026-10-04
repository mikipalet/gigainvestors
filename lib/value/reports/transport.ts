import {request as httpRequest} from 'node:http';
import {request as httpsRequest} from 'node:https';
import {brotliDecompressSync,gunzipSync,inflateSync} from 'node:zlib';

/** Filing bodies are consumed eagerly using Node's core HTTP client. Node 22's
 * bundled Undici can assert from a socket event on a paused/closing parser,
 * outside the promise catch in reports. Never leave that parser owning a body.
 */
export async function reportRequest(url:string,init:RequestInit={},redirects=0):Promise<Response>{
 const target=new URL(url);
 if(!['http:','https:'].includes(target.protocol))throw new Error('Invalid report URL protocol');
 if(redirects>5)throw new Error('Too many report redirects');
 const response=await new Promise<Response>((resolve,reject)=>{
  const headers=Object.fromEntries(new Headers(init.headers));
  const request=(target.protocol==='https:'?httpsRequest:httpRequest)(target,{headers,agent:false,signal:init.signal??undefined},incoming=>{
   const chunks:Buffer[]=[];let size=0;
   incoming.on('error',()=>reject(new Error('Report response truncated')));
   incoming.on('aborted',()=>reject(new Error('Report response truncated')));
   incoming.on('data',(chunk:Buffer)=>{
    size+=chunk.length;
    if(size>64*1024*1024){request.destroy(new Error('Report exceeds 64 MiB'));return;}
    chunks.push(chunk);
   });
   incoming.on('end',()=>{
    try{
     let body=Buffer.concat(chunks);
     const options={maxOutputLength:64*1024*1024};
     switch(incoming.headers['content-encoding']){
      case 'gzip':body=gunzipSync(body,options);break;
      case 'br':body=brotliDecompressSync(body,options);break;
      case 'deflate':body=inflateSync(body,options);break;
     }
     const headers=new Headers();
     for(const [name,value]of Object.entries(incoming.headers))if(value!==undefined)headers.set(name,Array.isArray(value)?value.join(', '):value);
     headers.delete('content-encoding');headers.delete('content-length');
     const status=incoming.statusCode??502;
     resolve(new Response([204,205,304].includes(status)?null:body,{status,headers}));
    }catch{reject(new Error('Invalid or oversized report response'));}
   });
  });
  const timer=setTimeout(()=>request.destroy(new Error('Report request timed out')),60_000);
  request.on('close',()=>clearTimeout(timer));
  request.on('error',()=>reject(new Error('Report request failed or timed out')));
  request.end();
 });
 if([301,302,303,307,308].includes(response.status)&&response.headers.has('location')){
  return reportRequest(new URL(response.headers.get('location')!,target).href,init,redirects+1);
 }
 return response;
}
