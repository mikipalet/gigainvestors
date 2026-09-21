"use client";

import { useEffect, useRef, useState } from "react";
import { aimAt, FLY_MS, flyAt, GESTURE_MS, gesturePose, HEAD_CASES_KEY, REST, resolveHeadCases, SNEEZE_AT, transformOf, type Gesture, type Pose, type Pt } from "@/lib/head-cases";

interface Head {
  pose: Pose;
  rest: { yaw: number; pitch: number };
  phase: number;
  gesture: { kind: Gesture; start: number; dir: number; peer: HTMLElement | null; fired: boolean } | null;
  held: { yaw: number; pitch: number; released: number | null } | null;
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

// The sketch sits object-contain at the bottom of its box, so the drawn height is the
// smaller of the box and the width scaled by the image's own aspect; the mouth is ~38% up.
function mouthOf(el: HTMLElement, r: DOMRect, side: number) {
  const img = el.querySelector("img");
  const aspect = img?.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
  const drawn = Math.min(r.height, r.width * aspect);
  return { x: r.x + r.width / 2 + side * drawn * 0.1, y: r.bottom - drawn * 0.38 };
}

function spawnSpatter(overlay: HTMLElement, el: HTMLElement, r: DOMRect, dir: number) {
  const scale = Math.min(1, Math.max(0.3, r.width / 160));
  const n = 3 + Math.floor(rand(4) + 4 * scale);
  const side = dir === 0 ? (rand() < 0.5 ? -1 : 1) : Math.sign(dir);
  const mouth = mouthOf(el, r, side);
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

function run({ overlay, onNewFaces }: { overlay: HTMLElement; onNewFaces: () => void }) {
  const heads = new WeakMap<HTMLElement, Head>();
  const state = (el: HTMLElement) => {
    let h = heads.get(el);
    if (!h) {
      h = newHead();
      heads.set(el, h);
      el.style.transformOrigin = "50% 85%";
      el.style.willChange = "transform";
    }
    return h;
  };

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
    for (const { el, r } of all) {
      const h = state(el);
      const c = centre(r);
      let g: ReturnType<typeof gesturePose> = {};
      if (h.gesture) {
        const t = (now - h.gesture.start) / GESTURE_MS[h.gesture.kind];
        if (t >= 1) h.gesture = null;
        else if (t >= 0) {
          g = gesturePose(h.gesture.kind, t, h.gesture.dir);
          if (h.gesture.kind === "sneeze" && !h.gesture.fired && t >= SNEEZE_AT) {
            h.gesture.fired = true;
            spawnSpatter(overlay, el, r, h.pose.yaw);
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
      el.style.transform = transformOf(
        { yaw: h.pose.yaw + (g.yaw ?? 0), pitch: h.pose.pitch + (g.pitch ?? 0), roll: g.roll ?? 0, lift: g.lift ?? 0, scale: g.scale ?? 1 },
        r.width,
      );
    }
    raf = requestAnimationFrame(frame);
  };

  const onMove = (e: PointerEvent) => {
    pointer = { x: e.clientX, y: e.clientY };
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    state(drag.el).held = { yaw: drag.yaw + dx * 0.35, pitch: drag.pitch - dy * 0.25, released: null };
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
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown, true);
    window.removeEventListener("pointerup", onUp, true);
    window.removeEventListener("pointercancel", onUp, true);
    window.removeEventListener("click", onClick, true);
    window.removeEventListener("dragstart", onDragStart, true);
    window.removeEventListener("keydown", onKey);
    overlay.replaceChildren();
    for (const el of document.querySelectorAll<HTMLElement>("[data-head]")) {
      el.style.transform = "";
      el.style.transformOrigin = "";
      el.style.willChange = "";
    }
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

// The portraits on the home treemap turn to follow the cursor, spin on click and react to
// the keys below. Off by default: see resolveHeadCases for how it is switched on.
export function HeadCases({ onNewFaces }: { onNewFaces: () => void }) {
  const [active, setActive] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const flag = resolveHeadCases({ search: window.location.search, stored: safeStorage("get"), env: process.env.NEXT_PUBLIC_HEAD_CASES });
    if (flag.persist) safeStorage("set", flag.persist);
    const capable = window.matchMedia("(pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setActive(flag.enabled && capable);
  }, []);

  useEffect(() => {
    if (!active || !overlay.current) return;
    return run({ overlay: overlay.current, onNewFaces });
  }, [active, onNewFaces]);

  if (!active) return null;
  return (
    <>
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
