'use client';
import { useEffect, useRef, type ReactNode } from 'react';

/** The portfolio sidebar pattern, with native modal focus containment and viewport-fitted tab content. */
export function SidePanel({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); queueMicrotask(() => previous?.focus()); };
  }, []);
  return <dialog ref={ref} className={`value-panel ${wide ? 'wide' : ''}`} aria-label={title} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="panel-shell"><header><h2>{title}</h2><button aria-label="Close panel" onClick={onClose}>Close <span aria-hidden="true">×</span></button></header><div className="panel-content">{children}</div></div>
  </dialog>;
}
