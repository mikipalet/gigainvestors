"use client";

import { useEffect, useRef, useState } from "react";
import { aimAt, FLY_MS, flyAt, GESTURE_MS, gesturePose, HEAD_CASES_KEY, REST, resolveHeadCases, SNEEZE_AT, type Gesture, type Pose, type Pt } from "@/lib/head-cases";
import { headGeometry, type HeadGeometry } from "@/lib/head-geometry";
import { HeadRenderer, type Box, type HeadDraw } from "@/lib/head-renderer";

interface Head {
  pose: Pose;
  rest: { yaw: number; pitch: number };
  phase: number;
  gesture: { kind: Gesture; start: number; dir: number; peer: HTMLElement | null; fired: boolean } | null;
  held: { yaw: number; pitch: number; released: number | null } | null;
}

interface Asset {
  tex: WebGLTexture | null;
  geom: HeadGeometry | null;
  aspect: number;
  size: 320 | 1200;
  loading: 320 | 1200 | null;
}

interface Drag {
  el: HTMLElement;
  x: number;
  y: number;
  yaw: number;
  pitch: number;
  moved: boolean;
}

const rand = (n = 1) => Math.random() * n;
const newHead = (): Head => ({ pose: { ...REST }, rest: { yaw: rand(12) - 6, pitch: rand(6) - 3 }, phase: rand(Math.PI * 2), gesture: null, held: null });

const FLY_SVG = `<svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="var(--ink)" stroke-width="1.2"><ellipse cx="8" cy="7" rx="4" ry="2.4" fill="var(--ink)"/><path d="M6 5.5 C3 1, 0 2, 4 6" /><path d="M10 5.5 C13 1, 16 2, 12 6" /><circle cx="12.5" cy="6.5" r="1.4" fill="var(--ink)"/></svg>`;

function safeStorage(op: "get" | "set", value?: string) {
  try {
    if (op === "get") return localStorage.getItem(HEAD_CASES_KEY);
    localStorage.setItem(HEAD_CASES_KEY, value ?? "");
  } catch {}
  return null;
}

function headOf(target: EventTarget | null) {
  const a = (target as Element | null)?.closest?.("a");
  const el = a?.querySelector<HTMLElement>("[data-head]");
  return a && el ? { a, el } : null;
}

const box = (r: DOMRect): Box => ({ x: r.x, y: r.y, w: r.width, h: r.height });

// The sketch sits object-contain at the bottom of its box.
function drawnRect(r: DOMRect, aspect: number): Box {
  const h = Math.min(r.height, r.width * aspect);
  const w = h / aspect;
  return { x: r.x + (r.width - w) / 2, y: r.bottom - h, w, h };
}

function spawnSpatter(overlay: HTMLElement, box: Box, geom: HeadGeometry, dir: number) {
  const scale = Math.min(1, Math.max(0.3, box.w / 160));
  const n = 3 + Math.floor(rand(4) + 4 * scale);
  const side = dir === 0 ? (rand() < 0.5 ? -1 : 1) : Math.sign(dir);
  const mouth = { x: box.x + (geom.cx + side * geom.rx * 0.3) * box.w, y: box.y + (geom.cy + geom.ry * 0.55) * box.h };
  for (let i = 0; i < n; i++) {
    const angle = (side > 0 ? 0.35 : Math.PI - 0.35) + (rand() - 0.5) * 1.1;
    const dist = (14 + rand(44)) * scale;
    const size = (1.5 + rand(3)) * (0.5 + scale / 2);
    const d = document.createElement("div");
    d.style.cssText = `position:absolute;left:${mouth.x}px;top:${mouth.y}px;width:${size}px;height:${size}px;border-radius:50%;background:var(--sell);animation:head-spatter ${1.1 + rand(0.5)}s ease-out forwards;--dx:${Math.cos(angle) * dist}px;--dy:${Math.sin(angle) * dist + 10}px`;
    overlay.append(d);
    setTimeout(() => d.remove(), 1700);
  }
}

function geometryOf(img: HTMLImageElement) {
  const c = document.createElement("canvas");
  c.width = 160;
  c.height = 200;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const { data } = ctx.getImageData(0, 0, c.width, c.height);
  const alpha = new Uint8Array(c.width * c.height);
  for (let p = 0; p < alpha.length; p++) alpha[p] = data[p * 4 + 3];
  return headGeometry({ alpha, w: c.width, h: c.height });
}

function run({ overlay, canvas, onNewFaces }: { overlay: HTMLElement; canvas: HTMLCanvasElement; onNewFaces: () => void }) {
  let renderer: HeadRenderer;
  try {
    renderer = new HeadRenderer(canvas, getComputedStyle(document.documentElement).getPropertyValue("--ink"));
  } catch (e) {
    console.warn("head cases: no WebGL", e);
    return () => {};
  }
  let lost = false;
  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
    showPictures();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  const heads = new WeakMap<HTMLElement, Head>();
  const state = (el: HTMLElement) => {
    let h = heads.get(el);
    if (!h) heads.set(el, (h = newHead()));
    return h;
  };

  const assets = new Map<string, Asset>();
  const load = (slug: string, size: 320 | 1200) => {
    const asset = assets.get(slug) ?? { tex: null, geom: null, aspect: 1.25, size: 320, loading: null };
    assets.set(slug, asset);
    if (asset.loading) return asset;
    asset.loading = size;
    const img = new Image();
    img.onload = () => {
      if (lost) return;
      asset.geom ??= geometryOf(img);
      asset.aspect = img.naturalHeight / img.naturalWidth;
      asset.tex = renderer.texture(img);
      asset.size = size;
      asset.loading = null;
    };
    img.onerror = () => (asset.loading = null);
    img.src = `/faces/v3/${slug}-${size}.webp`;
    return asset;
  };

  const hidden = new Set<HTMLElement>();
  const hidePicture = (el: HTMLElement) => {
    if (hidden.has(el)) return;
    const pic = el.querySelector<HTMLElement>("picture");
    if (pic) pic.style.visibility = "hidden";
    hidden.add(el);
  };
  const showPictures = () => {
    for (const el of hidden) {
      const pic = el.querySelector<HTMLElement>("picture");
      if (pic) pic.style.visibility = "";
    }
    hidden.clear();
  };

  const fit = () => renderer.resize(window.innerWidth, window.innerHeight, Math.min(2, window.devicePixelRatio || 1));
  fit();

  let pointer: Pt = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let fly: { el: HTMLElement; born: number; seed: number; pos: Pt } | null = null;
  let drag: Drag | null = null;
  let swallowClick = false;
  let pendingNav: ReturnType<typeof setTimeout> | null = null;
  let raf = 0;
  let last = performance.now();

  const visible = () => [...document.querySelectorAll<HTMLElement>("[data-head]")].map((el) => ({ el, r: el.getBoundingClientRect() }));
  const centre = (r: DOMRect): Pt => ({ x: r.x + r.width / 2, y: r.y + r.height * 0.55 });

  const startGesture = (kind: Gesture, stagger: (r: DOMRect) => number, peer = false) => {
    const all = visible();
    const now = performance.now();
    for (const { el, r } of all) {
      const h = state(el);
      let mate: HTMLElement | null = null;
      if (peer) {
        const c = centre(r);
        let best = Infinity;
        for (const o of all) {
          if (o.el === el) continue;
          const oc = centre(o.r);
          const d = (oc.x - c.x) ** 2 + (oc.y - c.y) ** 2;
          if (d < best) (best = d), (mate = o.el);
        }
      }
      const dir = mate ? Math.sign(mate.getBoundingClientRect().x - r.x) || 1 : 1;
      h.gesture = { kind, start: now + stagger(r), dir, peer: mate, fired: false };
    }
  };

  const toggleFly = () => {
    if (fly) {
      fly.el.remove();
      fly = null;
      return;
    }
    const el = document.createElement("div");
    el.innerHTML = FLY_SVG;
    el.style.cssText = "position:absolute;left:0;top:0;opacity:0;transition:opacity .4s";
    overlay.append(el);
    fly = { el, born: performance.now(), seed: rand(100), pos: pointer };
    requestAnimationFrame(() => (el.style.opacity = "1"));
  };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(64, now - last);
    last = now;
    const k = 1 - Math.exp(-dt / 90);

    if (fly) {
      const t = now - fly.born;
      if (t > FLY_MS) toggleFly();
      else {
        const box = { w: window.innerWidth, h: window.innerHeight };
        const p = flyAt({ t, seed: fly.seed, ...box });
        const prev = flyAt({ t: t - 16, seed: fly.seed, ...box });
        const ang = (Math.atan2(p.y - prev.y, p.x - prev.x) * 180) / Math.PI;
        fly.el.style.transform = `translate(${p.x - 8}px,${p.y - 6}px) rotate(${ang}deg)`;
        fly.pos = p;
      }
    }
    const target = fly ? fly.pos : pointer;

    const all = visible();
    const rects = new Map(all.map(({ el, r }) => [el, r]));
    const draws: HeadDraw[] = [];
    for (const { el, r } of all) {
      const h = state(el);
      const c = centre(r);
      let g: ReturnType<typeof gesturePose> = {};
      const slug = el.dataset.head ?? "";
      const asset = assets.get(slug) ?? load(slug, 320);
      if (h.gesture) {
        const t = (now - h.gesture.start) / GESTURE_MS[h.gesture.kind];
        if (t >= 1) h.gesture = null;
        else if (t >= 0) {
          g = gesturePose(h.gesture.kind, t, h.gesture.dir);
          if (h.gesture.kind === "sneeze" && !h.gesture.fired && t >= SNEEZE_AT) {
            h.gesture.fired = true;
            spawnSpatter(overlay, drawnRect(r, asset.aspect), asset.geom ?? { cx: 0.5, cy: 0.33, rx: 0.3, ry: 0.39 }, h.pose.yaw);
          }
        }
      }
      const peerRect = g.peer && h.gesture?.peer ? rects.get(h.gesture.peer) : undefined;
      const aim = aimAt({ from: c, to: peerRect ? centre(peerRect) : target });
      let yaw = g.front ? 0 : aim.yaw + h.rest.yaw + 2.5 * Math.sin(now / 1400 + h.phase);
      let pitch = g.front ? 0 : aim.pitch + h.rest.pitch + 1.5 * Math.sin(now / 1900 + h.phase * 1.7);
      if (h.held) {
        const decay = h.held.released === null ? 1 : Math.max(0, 1 - (now - h.held.released) / 2500);
        if (decay === 0) h.held = null;
        else {
          yaw += h.held.yaw * decay;
          pitch += h.held.pitch * decay;
        }
      }
      h.pose.yaw += (yaw - h.pose.yaw) * k;
      h.pose.pitch += (pitch - h.pose.pitch) * k;

      if (lost || !asset.tex || !asset.geom) continue;
      hidePicture(el);
      const rect = drawnRect(r, asset.aspect);
      if (rect.w > 340 && asset.size === 320) load(slug, 1200);
      const finalYaw = h.pose.yaw + (g.yaw ?? 0);
      const turned = Math.abs(((finalYaw % 360) + 540) % 360 - 180);
      draws.push({
        tex: asset.tex,
        geom: asset.geom,
        rect,
        clip: box((el.closest("a") ?? el).getBoundingClientRect()),
        pose: { yaw: finalYaw, pitch: h.pose.pitch + (g.pitch ?? 0), roll: g.roll ?? 0, lift: g.lift ?? 0, scale: g.scale ?? 1 },
        outline: Math.min(1, Math.max(0, (turned - 20) / 30)),
      });
    }
    if (!lost) renderer.draw(draws);
  };

  const onMove = (e: PointerEvent) => {
    pointer = { x: e.clientX, y: e.clientY };
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    state(drag.el).held = { yaw: drag.yaw + dx * 0.5, pitch: drag.pitch - dy * 0.3, released: null };
  };
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const hit = headOf(e.target);
    if (!hit) return;
    const held = state(hit.el).held;
    drag = { el: hit.el, x: e.clientX, y: e.clientY, yaw: held?.yaw ?? 0, pitch: held?.pitch ?? 0, moved: false };
  };
  const onUp = () => {
    if (!drag) return;
    if (drag.moved) {
      const h = state(drag.el);
      if (h.held) h.held.released = performance.now();
      swallowClick = true;
      setTimeout(() => (swallowClick = false), 50);
    }
    drag = null;
  };
  const onClick = (e: MouseEvent) => {
    const hit = headOf(e.target);
    if (!hit || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    if (swallowClick) return;
    state(hit.el).gesture = { kind: "spin", start: performance.now(), dir: 1, peer: null, fired: false };
    if (pendingNav) clearTimeout(pendingNav);
    pendingNav = setTimeout(() => window.location.assign(hit.a.href), GESTURE_MS.spin - 60);
  };
  const onDragStart = (e: DragEvent) => {
    if (headOf(e.target)) e.preventDefault();
  };
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLInputElement;
    if ((t?.tagName === "INPUT" && t.type !== "range") || e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.key.toLowerCase()) {
      case "w":
        return startGesture("wave", (r) => (r.x / window.innerWidth) * 700);
      case "f":
        return toggleFly();
      case "s":
        return startGesture("sneeze", () => rand(400));
      case "y":
        return startGesture("yawn", () => rand(500));
      case "g":
        return startGesture("gossip", () => rand(300), true);
      case " ":
        e.preventDefault();
        return startGesture("cheese", () => rand(120));
      case "n":
        return onNewFaces();
    }
  };

  window.addEventListener("resize", fit);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerdown", onDown, true);
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("pointercancel", onUp, true);
  window.addEventListener("click", onClick, true);
  window.addEventListener("dragstart", onDragStart, true);
  window.addEventListener("keydown", onKey);
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    if (pendingNav) clearTimeout(pendingNav);
    window.removeEventListener("resize", fit);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown, true);
    window.removeEventListener("pointerup", onUp, true);
    window.removeEventListener("pointercancel", onUp, true);
    window.removeEventListener("click", onClick, true);
    window.removeEventListener("dragstart", onDragStart, true);
    window.removeEventListener("keydown", onKey);
    canvas.removeEventListener("webglcontextlost", onLost);
    overlay.replaceChildren();
    showPictures();
    renderer.dispose();
  };
}

const KEYS: [string, string][] = [
  ["W", "wave"],
  ["F", "fly"],
  ["S", "sneeze"],
  ["Y", "yawn"],
  ["G", "gossip"],
  ["space", "say cheese"],
  ["N", "new faces"],
];

// The portraits on the home treemap become 3D heads that turn to follow the cursor, spin
// on click and react to the keys below. Off by default: see resolveHeadCases.
export function HeadCases({ onNewFaces }: { onNewFaces: () => void }) {
  const [active, setActive] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const flag = resolveHeadCases({ search: window.location.search, stored: safeStorage("get"), env: process.env.NEXT_PUBLIC_HEAD_CASES });
    if (flag.persist) safeStorage("set", flag.persist);
    const capable = window.matchMedia("(pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setActive(flag.enabled && capable);
  }, []);

  useEffect(() => {
    if (!active || !overlay.current || !canvas.current) return;
    return run({ overlay: overlay.current, canvas: canvas.current, onNewFaces });
  }, [active, onNewFaces]);

  if (!active) return null;
  return (
    <>
      <canvas ref={canvas} className="pointer-events-none fixed inset-0 z-[35] h-full w-full" />
      <div ref={overlay} className="pointer-events-none fixed inset-0 z-50" />
      <div className="pointer-events-none fixed bottom-[2px] left-5 z-[41] hidden items-center gap-3 bg-paper pr-3 text-[9px] leading-none opacity-70 sm:flex">
        <span className="font-semibold tracking-[0.18em]">HEAD CASES</span>
        <span className="italic">move, click to spin, drag to turn a head</span>
        {KEYS.map(([k, what]) => (
          <span key={k} className="flex items-center gap-1 italic">
            <kbd className="rounded-[2px] px-[3px] py-[1px] font-sans not-italic shadow-[0_0_0_1px_var(--ink)]">{k}</kbd>
            {what}
          </span>
        ))}
      </div>
      <style>{`@keyframes head-spatter{from{transform:translate(0,0);opacity:.9}to{transform:translate(var(--dx),var(--dy));opacity:0}}`}</style>
    </>
  );
}
