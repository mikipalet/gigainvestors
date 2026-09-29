'use client';
import { useEffect, useState } from 'react';
import type { TestOutcome } from '@/lib/value/types';
import { testLabels } from './TestChips';
import { StatusGlyph } from './viz/StatusGlyph';
export function SectionNav({ tests }: { tests: TestOutcome[] }) {
  const [active, setActive] = useState('price');
  useEffect(() => {
    const observer = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id.replace('test-', '')); }, { rootMargin: '-10% 0px -65% 0px' });
    document.querySelectorAll('[id^="test-"]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return <nav className="section-nav" aria-label="Dossier sections">{tests.map(test => <a key={test.key} href={`#test-${test.key}`} aria-current={active === test.key ? 'location' : undefined}><StatusGlyph result={test.result} label={test.result} />{testLabels[test.key]}</a>)}<a href="#assumptions">Assumptions ↗</a></nav>;
}
