const { chromium } = require('/Users/miki/GitHub/superinvestors/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  let prev=null, resets=0;
  for (let i=1;i<=12;i++){
    const u = ['https://zernio.com/pricing','https://zernio.com/signin','https://zernio.com/'][i%3];
    await p.goto(u,{waitUntil:'networkidle',timeout:60000}).catch(()=>{});
    await p.waitForTimeout(4000);
    const st = await p.evaluate(()=>{ let k=null; for(let i=0;i<localStorage.length;i++){const x=localStorage.key(i); if(x.startsWith('ph_')&&x.endsWith('_posthog')) k=x;}
      if(!k) return {none:true}; const o=JSON.parse(localStorage.getItem(k));
      return {did:o.distinct_id, dev:o.$device_id, reset:o.$last_posthog_reset||null}; });
    const changed = prev && st.did!==prev;
    if (changed) resets++;
    console.log('load'+String(i).padStart(2)+' '+u.replace('https://zernio.com','')||'/', ' did='+(st.did||'').slice(0,8), ' dev='+(st.dev||'').slice(0,8), ' did_changed='+(prev?changed:'-'), ' lastReset='+(st.reset||'none'));
    prev = st.did;
  }
  console.log('TOTAL distinct_id changes across 11 repeat loads:', resets);
  await b.close();
})();
