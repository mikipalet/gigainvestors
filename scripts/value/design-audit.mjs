export const audit = () => {
  const vw = innerWidth;
  const root=document.querySelector("dialog[open],.search-modal")??document.body;
  const issues = [];
  if (document.documentElement.scrollWidth > vw + 1) issues.push(`horizontal overflow: ${document.documentElement.scrollWidth}px > ${vw}px`);
  for (const el of root.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 2 || r.height <= 2 || cs.clipPath === "inset(50%)" || cs.clip === "rect(0px, 0px, 0px, 0px)" || /sr-only/.test(el.className?.toString?.() ?? "")) continue;
    if (r.right > vw + 1 && cs.position !== "fixed") { issues.push(`off-screen right: <${el.tagName.toLowerCase()} class="${(el.className?.baseVal ?? el.className ?? "").toString().slice(0, 40)}"> ${el.textContent?.trim().slice(0, 40)}`); }
    const clips = ["hidden", "clip"].includes(cs.overflowX) || cs.textOverflow === "ellipsis";
    if (clips && el.scrollWidth > el.clientWidth + 1 && el.children.length === 0) issues.push(`clipped text: "${el.textContent?.trim().slice(0, 50)}"`);
  }
  for (const svg of root.querySelectorAll("svg")) {
    const texts = [...svg.querySelectorAll("text")].map(t => ({ t: t.textContent, b: t.getBoundingClientRect() })).filter(x => x.b.width > 0);
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i].b, c = texts[j].b;
      if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) issues.push(`overlapping chart labels: "${texts[i].t}" / "${texts[j].t}"`);
    }
  }
  // HTML text collisions: visible leaf text boxes overlapping each other
  const leaves = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const n = walker.currentNode; if (!n.textContent.trim()) continue;
    const el = n.parentElement; if (!el) continue;
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true })) continue;
    if (el.closest(".sr-only") || getComputedStyle(el).clipPath === "inset(50%)") continue;
    { const er = el.getBoundingClientRect(); if (er.width <= 2 || er.height <= 2) continue; }
    const range = document.createRange(); range.selectNodeContents(n);
    for (const b of range.getClientRects()) if (b.width > 2 && b.height > 2) leaves.push({ t: n.textContent.trim().slice(0, 30), b, el });
  }
  for (let i = 0; i < leaves.length && issues.length < 80; i++) for (let j = i + 1; j < leaves.length; j++) {
    const a = leaves[i].b, c = leaves[j].b;
    if (leaves[i].el === leaves[j].el) continue;
    const overlayA=leaves[i].el.closest('.design-options,[role="tooltip"],.value-dock'),overlayB=leaves[j].el.closest('.design-options,[role="tooltip"],.value-dock');
    if(overlayA!==overlayB&&(overlayA||overlayB))continue; // Opaque overlays intentionally cover the page behind them.
    if (a.left < c.right - 2 && c.left < a.right - 2 && a.top < c.bottom - 2 && c.top < a.bottom - 2) issues.push(`overlapping text: "${leaves[i].t}" / "${leaves[j].t}"`);
  }
  // text clipped by an ancestor with overflow hidden, or cut by the viewport bottom on no-scroll pages
  for (const { t, b, el } of leaves) {
    let p = el.parentElement;
    while (p && p !== document.body) {
      const ps = getComputedStyle(p);
      if (/(hidden|clip)/.test(ps.overflow + ps.overflowX + ps.overflowY)) { const pb = p.getBoundingClientRect(); if (b.bottom > pb.bottom + 1 || b.right > pb.right + 1 || b.top < pb.top - 1) { issues.push(`text cut by container: "${t}"`); break; } }
      p = p.parentElement;
    }
    if (getComputedStyle(document.body).overflow === "hidden" && b.bottom > innerHeight + 1) issues.push(`text below the fold on a no-scroll page: "${t}"`);
  }
  const main = document.querySelector("main") ?? document.body;
  const content = [...main.querySelectorAll("table, svg, section, figure")].reduce((m, el) => Math.max(m, el.getBoundingClientRect().width), 0);
  return { issues: [...new Set(issues)].slice(0, 40), widthUse: +(content / vw).toFixed(2), screens: +(document.documentElement.scrollHeight / innerHeight).toFixed(1) };
};
