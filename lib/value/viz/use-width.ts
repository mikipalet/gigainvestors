'use client';
import { useEffect, useRef, useState } from 'react';
export function useWidth() {
  const ref = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(350);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {setWidth(Math.max(120, entry.contentRect.width));setHeight(entry.contentRect.height);});
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width, height };
}
