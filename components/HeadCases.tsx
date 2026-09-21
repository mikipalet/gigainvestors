"use client";

import { useEffect, useRef, useState } from "react";
import { aimAt, FLY_MS, flyAt, GESTURE_MS, gesturePose, HEAD_CASES_KEY, REST, resolveHeadCases, SNEEZE_AT, type Gesture, type Pose, type Pt } from "@/lib/head-cases";
import { headGeometry } from "@/lib/head-geometry";
import { drawHead, NEUTRAL, rotation, type Expression } from "@/lib/heads/draw";
import { buildHead, type Detail, type HeadModel } from "@/lib/heads/model";
import { hashSeed, sketchHair, traitsFor, type SketchHair } from "@/lib/heads/traits";

interface Head {
  pose: Pose;
  rest: { yaw: number; pitch: number };
  phase: number;
  gesture: { kind: Gesture; start: number; dir: number; peer: HTMLElement | null; fired: boolean } | null;
  held: { yaw: number; pitch: number; released: number | null } | null;
  nextBlink: number;
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
const newHead = (now: number): Head => ({ pose: { ...REST }, rest: { yaw: rand(12) - 6, pitch: rand(6) - 3 }, phase: rand(Math.PI * 2), gesture: null, held: null, nextBlink: now + 1000 + rand(5000) });

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

function spawnSpatter(overlay: HTMLElement, mouth: Pt, size: number, dir: number) {
  const scale = Math.min(1, Math.max(0.3, size / 60));
  const n = 3 + Math.floor(rand(4) + 4 * scale);
  const side = dir === 0 ? (rand() < 0.5 ? -1 : 1) : Math.sign(dir);
  for (let i = 0; i < n; i++) {
    const angle = (side > 0 ? 0.35 : Math.PI - 0.35) + (rand() - 0.5) * 1.1;
    const dist = (14 + rand(44)) * scale;
    const dot = (1.5 + rand(3)) * (0.5 + scale / 2);
    const d = document.createElement("div");
    d.style.cssText = `position:absolute;left:${mouth.x}px;top:${mouth.y}px;width:${dot}px;height:${dot}px;border-radius:50%;background:var(--sell);animation:head-spatter ${1.1 + rand(0.5)}s ease-out forwards;--dx:${Math.cos(angle) * dist}px;--dy:${Math.sin(angle) * dist + 10}px`;
    overlay.append(d);
    setTimeout(() => d.remove(), 1700);
  }
}

function hairOf(img: HTMLImageElement): SketchHair {
  const c = document.createElement("canvas");
  c.width = 160;
  c.height = 200;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const { data } = ctx.getImageData(0, 0, c.width, c.height);
  const alpha = new Uint8Array(c.width * c.height);
  for (let p = 0; p < alpha.length; p++) alpha[p] = data[p * 4 + 3];
  return sketchHair({ alpha, w: c.width, h: c.height, head: headGeometry({ alpha, w: c.width, h: c.height }) });
}

function hatchPattern(ctx: CanvasRenderingContext2D, ink: string, dpr: number) {
  const c = document.createElement("canvas");
  c.width = c.height = Math.round(6 * dpr);
  const g = c.getContext("2d")!;
  g.strokeStyle = ink;
  g.lineWidth = dpr * 0.9;
  g.beginPath();
  g.moveTo(0, c.height);
  g.lineTo(c.width, 0);
  g.stroke();
  const p = ctx.createPattern(c, "repeat");
  p?.setTransform(new DOMMatrix().scale(1 / dpr));
  return p;
}

// What a gesture does to the face while it runs.
function expressionOf(kind: Gesture | null, t: number): Expression {
  if (!kind || t < 0) return NEUTRAL;
  switch (kind) {
    case "sneeze":
      return t < SNEEZE_AT ? { mouthOpen: 0.8 * (t / SNEEZE_AT), smile: 0, eyesClosed: t > 0.25 ? 1 : 0, browRaise: 0.6 } : { mouthOpen: 0, smile: 0, eyesClosed: t < 0.8 ? 1 : 0, browRaise: -0.4 };
    case "yawn": {
      const b = Math.sin(Math.PI * t);
      return { mouthOpen: b, smile: 0, eyesClosed: b > 0.4 ? 1 : 0, browRaise: 0.3 };
    }
    case "cheese":
      return { mouthOpen: 0, smile: 1, eyesClosed: 0, browRaise: 0.5 };
    case "gossip":
      return { mouthOpen: 0.35 * Math.abs(Math.sin(t * 22)), smile: 0.4, eyesClosed: 0, browRaise: 0.3 };
    case "wave":
      return { mouthOpen: 0, smile: 0.7, eyesClosed: 0, browRaise: 0.3 };
    case "spin":
      return { mouthOpen: 0.3, smile: 0, eyesClosed: 1, browRaise: 0 };
  }
}

function run({ overlay, canvas, onNewFaces }: { overlay: HTMLElement; canvas: HTMLCanvasElement; onNewFaces?: () => void }) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const css = getComputedStyle(document.documentElement);
  const ink = css.getPropertyValue("--ink").trim() || "#111";
  const red = css.getPropertyValue("--sell").trim() || "#bf3b2b";
  let dpr = 1;
  let hatch: CanvasPattern | null = null;
  const fit = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    hatch = hatchPattern(ctx, ink, dpr);
  };
  fit();

  const heads = new WeakMap<HTMLElement, Head>();
  const state = (el: HTMLElement) => {
    let h = heads.get(el);
    if (!h) heads.set(el, (h = newHead(performance.now())));
    return h;
  };

  let generation = 0;
  const sketches = new Map<string, SketchHair | null>();
  const models = new Map<string, HeadModel>();
  const modelFor = (slug: string, detail: Detail) => {
    const key = `${slug}|${generation}|${detail}`;
    let m = models.get(key);
    if (m) return m;
    if (!sketches.has(slug)) {
      sketches.set(slug, null);
      const img = new Image();
      img.onload = () => {
        sketches.set(slug, hairOf(img));
        for (const k of models.keys()) if (k.startsWith(`${slug}|`)) models.delete(k);
      };
      img.src = `/faces/v3/${slug}-320.webp`;
    }
    m = buildHead(traitsFor(hashSeed(slug) + generation * 7919, sketches.get(slug) ?? undefined), detail);
    models.set(key, m);
    return m;
  };

  const hidden = new Set<HTMLElement>();
  const hidePicture = (el: HTMLElement) => {
    if (hidden.has(el)) return;
    const pic = el.querySelector<HTMLElement>("picture");
    if (pic) pic.style.visibility = "hidden";
    hidden.add(el);
  };

  let pointer: Pt = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let fly: { el: HTMLElement; born: number; seed: number; pos: Pt } | null = null;
  let drag: Drag | null = null;
  let swallowClick = false;
  let pendingNav: ReturnType<typeof setTimeout> | null = null;
  let raf = 0;
  let last = performance.now();

  const visible = () => [...document.querySelectorAll<HTMLElement>("[data-head]")].map((el) => ({ el, r: el.getBoundingClientRect() }));
  const place = (r: DOMRect) => {
    const scale = Math.min(r.width * 0.26, r.height / 3.4);
    return { scale, center: { x: r.x + r.width / 2, y: r.y + scale * 1.35 } };
  };
  const centre = (r: DOMRect): Pt => place(r).center;

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

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const all = visible();
    const rects = new Map(all.map(({ el, r }) => [el, r]));
    for (const { el, r } of all) {
      if (r.width < 14) continue;
      const h = state(el);
      const { scale, center } = place(r);
      const slug = el.dataset.head ?? "";
      const model = modelFor(slug, scale > 60 ? "fine" : scale > 30 ? "mid" : "coarse");
      let g: ReturnType<typeof gesturePose> = {};
      let expression = NEUTRAL;
      let mouthDir = 0;
      if (h.gesture) {
        const t = (now - h.gesture.start) / GESTURE_MS[h.gesture.kind];
        if (t >= 1) h.gesture = null;
        else if (t >= 0) {
          g = gesturePose(h.gesture.kind, t, h.gesture.dir);
          expression = expressionOf(h.gesture.kind, t);
          if (h.gesture.kind === "sneeze" && !h.gesture.fired && t >= SNEEZE_AT) {
            h.gesture.fired = true;
            mouthDir = Math.sign(h.pose.yaw);
          }
        }
      }
      if (!h.gesture && now > h.nextBlink) {
        if (now > h.nextBlink + 130) h.nextBlink = now + 2000 + rand(5000);
        else expression = { ...NEUTRAL, eyesClosed: 1 };
      }
      const peerRect = g.peer && h.gesture?.peer ? rects.get(h.gesture.peer) : undefined;
      const aim = aimAt({ from: center, to: peerRect ? centre(peerRect) : target });
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
      const look = { x: Math.max(-1, Math.min(1, (aim.yaw - h.pose.yaw) / 25)), y: Math.max(-1, Math.min(1, (aim.pitch - h.pose.pitch) / 20)) };
      const pose: Pose = { yaw: h.pose.yaw + (g.yaw ?? 0), pitch: h.pose.pitch + (g.pitch ?? 0), roll: g.roll ?? 0, lift: g.lift ?? 0, scale: g.scale ?? 1 };

      hidePicture(el);
      const clip = (el.closest("a") ?? el).getBoundingClientRect();
      ctx.save();
      ctx.beginPath();
      ctx.rect(clip.x, clip.y, clip.width, clip.height);
      ctx.clip();
      drawHead({ ctx, model, center, scale, pose, expression, look, ink, red, hatch });
      ctx.restore();

      if (mouthDir !== 0 || (h.gesture?.fired && h.gesture.kind === "sneeze" && mouthDir !== 0)) {
        const m = rotation(pose);
        const p = model.mouth.p;
        const x = center.x + (m[0] * p[0] + m[1] * p[1] + m[2] * p[2]) * scale;
        const y = center.y + pose.lift - (m[3] * p[0] + m[4] * p[1] + m[5] * p[2]) * scale;
        spawnSpatter(overlay, { x, y }, scale, mouthDir);
      }
    }
  };

  const onMove = (e: PointerEvent) => {
    pointer = { x: e.clientX, y: e.clientY };
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    state(drag.el).held = { yaw: drag.yaw + dx * 0.6, pitch: drag.pitch - dy * 0.35, released: null };
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
        generation++;
        models.clear();
        onNewFaces?.();
        return;
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
    overlay.replaceChildren();
    for (const el of hidden) {
      const pic = el.querySelector<HTMLElement>("picture");
      if (pic) pic.style.visibility = "";
    }
    hidden.clear();
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

// The portraits on the home treemap become line-drawn 3D heads that turn to follow the
// cursor, spin on click and react to the keys below. Off by default: see resolveHeadCases.
export function HeadCases({ onNewFaces }: { onNewFaces?: () => void }) {
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
        <span className="italic">every line is code · move, click to spin, drag to turn a head</span>
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
