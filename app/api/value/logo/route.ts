/** A provider can return a valid grey PNG with HTTP 404. Browsers still draw it.
 * Strip that image so CompanyLogo can display its own monogram instead. */
export async function GET(request:Request) {
 const domain=new URL(request.url).searchParams.get('domain')??'';
 if(!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain)||domain.length>253)return new Response(null,{status:400});
 try {
  const response=await fetch(`https://icons.duckduckgo.com/ip3/${domain}.ico`,{next:{revalidate:86400},signal:AbortSignal.timeout(5000)});
  if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))return new Response(null,{status:204,headers:{'Cache-Control':'public, max-age=3600'}});
  return new Response(await response.arrayBuffer(),{headers:{'Content-Type':response.headers.get('content-type')!,'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});
 } catch { return new Response(null,{status:204}); }
}
