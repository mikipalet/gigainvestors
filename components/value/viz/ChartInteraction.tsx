'use client';
import { useEffect, useId, useRef, useState, type ReactNode, type PointerEvent } from 'react';

export type ChartPoint = { x: number; y?: number; text: string; href?: string };
/** A separate HTML focus layer keeps SVG decorative without hiding controls. */
export function ChartInteraction({ points, width, height, label, children, onActive, fallback = '' }: { points: ChartPoint[]; width: number; height: number; label: string; children: ReactNode; onActive?: (index: number | null) => void; fallback?: string }) {
  const [active, setActive] = useState<number | null>(null);
  const [roving, setRoving] = useState(0);
  const [pinned, setPinned] = useState(false);
  const refs = useRef<Array<HTMLButtonElement | HTMLAnchorElement | null>>([]);
  const tipId = useId();
  const touch = useRef(false);
  const touchNavigate = useRef(false);
  const dismissed = useRef(false);
  const hovered = useRef(false);
  useEffect(() => {
    if (active === null) return;
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { dismissed.current = true; setPinned(false); setActive(null); onActive?.(null); } };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [active, onActive]);
  const select = (index: number | null) => { setActive(index); onActive?.(index); };
  return <div className="chart-interaction" onPointerEnter={() => { hovered.current = true; dismissed.current = false; }} onPointerLeave={e => { hovered.current = false; dismissed.current = false; if (!pinned && !e.currentTarget.contains(document.activeElement)) select(null); }} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget) && !pinned && !hovered.current) select(null); }} onKeyDown={e => {
    if (e.key === 'Escape') { dismissed.current = true; e.preventDefault(); setPinned(false); select(null); }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key) && points.length) {
      e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? points.length - 1 : Math.max(0, Math.min(points.length - 1, roving + (['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 1)));
      setRoving(next); select(next); refs.current[next]?.focus();
    }
  }}>
    <div className="relative" style={{ height }}>
      {children}
      <div role="group" aria-label={label} className="absolute inset-0" onPointerDown={e => { touch.current = e.pointerType === "touch"; }} onPointerMove={e => {
        if (dismissed.current || pinned || e.pointerType === 'touch' || !points.length) return;
        const rect = e.currentTarget.getBoundingClientRect(), px = (e.clientX - rect.left) / rect.width * width, py = e.clientY - rect.top;
        select(points.reduce((best, p, i) => Math.hypot(p.x - px, p.y === undefined ? 0 : p.y - py) < Math.hypot(points[best].x - px, points[best].y === undefined ? 0 : points[best].y! - py) ? i : best, 0));
      }} onClick={e => {
        if ((e.target as HTMLElement).closest('button,a') || !points.length) return;
        const rect = e.currentTarget.getBoundingClientRect(), px = (e.clientX - rect.left) / rect.width * width, py = e.clientY - rect.top;
        const next = points.reduce((best, p, i) => Math.hypot(p.x - px, p.y === undefined ? 0 : p.y - py) < Math.hypot(points[best].x - px, points[best].y === undefined ? 0 : points[best].y! - py) ? i : best, 0);
        select(next); setRoving(next); setPinned(true); refs.current[next]?.focus({ preventScroll: true });
      }}>
        <ul className="contents">{points.map((point, i) => {
          const props = { 'aria-label': point.text, 'aria-describedby': active === i ? tipId : undefined, tabIndex: roving === i ? 0 : -1, className: 'viz-point absolute', style: { left: `${point.x / width * 100}%`, top: point.y ?? height / 2 }, onPointerDown: (e: PointerEvent<HTMLElement>) => { touch.current = e.pointerType === 'touch'; touchNavigate.current = pinned && active === i; if (touch.current) { select(i); setPinned(true); } }, onFocus: () => { dismissed.current = false; setRoving(i); select(i); }, onClick: () => { select(i); setPinned(true); } };
          return <li key={i} className="contents">{point.href ? <a {...props} onClick={e => { if (touch.current && !touchNavigate.current) e.preventDefault(); select(i); setPinned(true); }} href={point.href} ref={node => { refs.current[i] = node; }} /> : <button {...props} type="button" ref={node => { refs.current[i] = node; }} />}</li>;
        })}</ul>
      </div>
    </div>
    {active !== null && <svg className="chart-crosshair" aria-hidden="true" viewBox={`0 0 ${width} ${height}`} style={{height}}><line x1={points[active]?.x} x2={points[active]?.x} y1="8" y2={height-20} stroke="var(--viz-muted)"/>{points[active]?.y !== undefined && <circle cx={points[active].x} cy={points[active].y} r="4" fill="var(--ink)" stroke="var(--paper)" strokeWidth="2"/>}</svg>}
    <p id={tipId} className={active === null ? 'chart-fallback' : 'viz-tooltip'} style={active === null ? undefined : {left: `${Math.max(0, Math.min(55, (points[active]?.x ?? 0) / width * 100))}%`, top: Math.max(0, (points[active]?.y ?? height / 2) - 62)}} role={active === null ? undefined : 'tooltip'}>{active === null ? fallback : points[active]?.text}{active !== null && points[active]?.href && <> <a className="underline" href={points[active].href}>Open dossier</a></>}</p>
    <span className="sr-only" aria-live="polite" aria-atomic="true">{active === null ? '' : points[active]?.text}</span>
  </div>;
}
