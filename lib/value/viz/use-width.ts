'use client';
import { useEffect, useRef, useState } from 'react';
export function useWidth() {
  const ref = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(350);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(120, entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}
