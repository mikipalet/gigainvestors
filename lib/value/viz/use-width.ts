'use client';
import { useEffect, useRef, useState } from 'react';
export function useWidth() {
  const ref = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(350);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame=0;
    const observer = new ResizeObserver(([entry]) => {
      const {width:nextWidth,height:nextHeight}=entry.contentRect;
      cancelAnimationFrame(frame);
      // Chart rendering can affect the observed box. Commit outside the current
      // observer delivery so WebKit does not drop notifications in a resize loop.
      frame=requestAnimationFrame(()=>{setWidth(Math.max(120,nextWidth));setHeight(nextHeight);});
    });
    observer.observe(element);
    return () => {observer.disconnect();cancelAnimationFrame(frame);};
  }, []);
  return { ref, width, height };
}
