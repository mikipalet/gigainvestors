// usage: node design-qa.mjs <baseUrl> <outDir> [paths comma-separated]
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const [base, out, pathArg] = process.argv.slice(2);
const paths = (pathArg ?? "/,/?near=1,/ko.us,/aapl.us,/cb.us,/dal.us,/nope.us").split(",");
const viewports = (process.env.QA_VIEWPORTS ?? "390x844,768x1024,1280x800,1440x900,1920x1080").split(",").map(v => v.split("x").map(Number));
mkdirSync(out, { recursive: true });

const audit = () => {
  const vw = innerWidth;
  const issues = [];
  const publicText=document.body.innerText+' '+[...document.querySelectorAll('[title],[aria-label]')].map(e=>(e.getAttribute('title')??'')+' '+(e.getAttribute('aria-label')??'')).join(' ');
  const gap=publicText.match(/not enough (?:evidence|data)|not reported|unavailable|\bunclear\b|not tested|cannot judge/i);if(gap&&!location.pathname.includes('/method'))issues.push(`Forbidden gap wording: ${gap[0]}`);
  if (document.documentElement.scrollWidth > vw + 1) issues.push(`horizontal overflow: ${document.documentElement.scrollWidth}px > ${vw}px`);
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 2 || r.height <= 2 || cs.clipPath === "inset(50%)" || cs.clip === "rect(0px, 0px, 0px, 0px)" || /sr-only/.test(el.className?.toString?.() ?? "")) continue;
    if (r.right > vw + 1 && cs.position !== "fixed") { issues.push(`off-screen right: <${el.tagName.toLowerCase()} class="${(el.className?.baseVal ?? el.className ?? "").toString().slice(0, 40)}"> ${el.textContent?.trim().slice(0, 40)}`); }
    const clips = ["hidden", "clip"].includes(cs.overflowX) || cs.textOverflow === "ellipsis";
    if (clips && el.scrollWidth > el.clientWidth + 1 && el.children.length === 0) issues.push(`clipped text: "${el.textContent?.trim().slice(0, 50)}"`);
  }
  for (const svg of document.querySelectorAll("svg")) {
    const texts = [...svg.querySelectorAll("text")].map(t => ({ t: t.textContent, b: t.getBoundingClientRect() })).filter(x => x.b.width > 0);
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i].b, c = texts[j].b;
      if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) issues.push(`overlapping chart labels: "${texts[i].t}" / "${texts[j].t}"`);
    }
  }
  // HTML text collisions: visible leaf text boxes overlapping each other
  const leaves = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
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
  // Structural rules must not strike through text, even when the document height fits.
  for (const rule of document.querySelectorAll('.test-tile,.buy-tile,.funnel,.dossier-source,.value-bottom')) {
    const rect=rule.getBoundingClientRect(),style=getComputedStyle(rule);
    for(const {t,b} of leaves)for(const [edge,border] of [[rect.top,style.borderTopWidth],[rect.bottom,style.borderBottomWidth]]) {
      if(parseFloat(border)>0&&b.left<rect.right&&b.right>rect.left&&b.top<edge-1&&b.bottom>edge+1)issues.push(`text crosses a structural rule: "${t}"`);
    }
  }
  const main = document.querySelector("main") ?? document.body;
  const content = [...main.querySelectorAll("table, svg, section, figure")].reduce((m, el) => Math.max(m, el.getBoundingClientRect().width), 0);
  return { issues: [...new Set(issues)].slice(0, 40), widthUse: +(content / vw).toFixed(2), screens: +(document.documentElement.scrollHeight / innerHeight).toFixed(1) };
};

const browser = await chromium.launch();
const report = [];
for (const [w, h] of viewports) {
  for (const path of paths) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on("console", m => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
    page.on("pageerror", e => errors.push(String(e).slice(0, 160)));
    const res = await page.goto(base + path, { waitUntil: "networkidle", timeout: 90000 }).catch(e => ({ status: () => String(e).slice(0, 80) }));
    await page.waitForTimeout(600);
    const name = `${w}x${h}${path.replace(/[^a-z0-9]+/gi, "_")}`;
    if(process.env.QA_SCREENSHOTS!=='0')await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
    const a = await page.evaluate(audit);
    // interaction: focus + hover the first interactive chart layer and snapshot the viewport
    const target = page.locator('.company-map svg a, [tabindex="0"]').first();
    if (process.env.QA_HOVER !== '0' && await target.count()) {
      await target.focus().catch(() => {});
      await page.keyboard.press("ArrowRight").catch(() => {});
      const box = await target.boundingBox().catch(() => null);
      if (box) await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);
      await page.waitForTimeout(300);
      if(process.env.QA_SCREENSHOTS!=='0')await page.screenshot({ path: `${out}/${name}-hover.png` });
    }
    report.push({ viewport: `${w}x${h}`, path, status: res?.status?.(), console: errors.slice(0, 5), ...a });
    await page.close();
  }
}
await browser.close();
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
for (const r of report) console.log(`${r.viewport} ${r.path} status=${r.status} widthUse=${r.widthUse} screens=${r.screens} issues=${r.issues.length} console=${r.console.length}${r.issues.length ? "\n   - " + r.issues.slice(0, 6).join("\n   - ") : ""}`);
