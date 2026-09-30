// The supplied baseline profile, preserved for apples-to-apples comparisons.
// Its download rate is 16 Mbps (the original expression includes *10).
import { chromium } from "@playwright/test";
const b = await chromium.launch();
for (const [label, vp, throttle] of [["desktop", {width:1728,height:970}, false], ["mobile-4g", {width:390,height:844}, true]]) {
 for (const path of ["/", "/ko.us", "/?year=2018"]) {
  const ctx = await b.newContext({ viewport: vp }); const p = await ctx.newPage();
  if (throttle) { const c = await ctx.newCDPSession(p); await c.send("Network.emulateNetworkConditions",{offline:false,latency:150,downloadThroughput:1.6e6/8*10,uploadThroughput:750e3/8*10}); await c.send("Emulation.setCPUThrottlingRate",{rate:4}); }
  const reqs = []; p.on("response", async r => { try { const h = await r.allHeaders(); reqs.push({ u: r.url().replace(/^https?:\/\//,"").slice(0,90), t: r.request().resourceType(), s: +(h["content-length"]||0), cache: h["x-vercel-cache"]||h["cf-cache-status"]||"" }); } catch {} });
  await p.addInitScript(() => { window.__lcp=0; new PerformanceObserver(l=>{for(const e of l.getEntries()) window.__lcp=e.startTime}).observe({type:"largest-contentful-paint",buffered:true}); window.__cls=0; new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput) window.__cls+=e.value}).observe({type:"layout-shift",buffered:true}); });
  const t0 = Date.now(); await p.goto((process.argv[2] ?? "http://localhost:3013")+path, { waitUntil: "networkidle" }); const idle = Date.now()-t0;
  await p.waitForTimeout(800);
  const m = await p.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; const res = performance.getEntriesByType("resource"); const sum = k => res.filter(r=>r.initiatorType===k||(k==="fetch"&&r.initiatorType==="xmlhttprequest")).reduce((a,r)=>a+r.transferSize,0); return { ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd), lcp: Math.round(window.__lcp), cls: +window.__cls.toFixed(3), html: n.transferSize, js: sum("script"), fetch: sum("fetch"), img: sum("img"), css: sum("link"), nres: res.length }; });
  console.log(label, path, JSON.stringify({ idle, ...m }));
  const big = reqs.filter(r=>r.t!=="image").sort((a,c)=>c.s-a.s).slice(0,6); console.log("   top:", big.map(r=>`${r.t} ${Math.round(r.s/1024)}KB ${r.cache} ${r.u}`).join("\n        "));
  console.log("   images:", reqs.filter(r=>r.t==="image").length, "hosts:", [...new Set(reqs.filter(r=>r.t==="image").map(r=>r.u.split("/")[0]))].join(","));
  await ctx.close();
 }
}
await b.close();
