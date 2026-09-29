'use client';
import { useEffect, useState } from 'react';
import type { TestOutcome } from '@/lib/value/types';
import { testLabels } from './TestChips';
import { StatusGlyph } from './viz/StatusGlyph';
export function SectionNav({ tests }: { tests: TestOutcome[] }) {
  const [active, setActive] = useState('price');
  useEffect(() => {
    const update=()=>{const sections=[...document.querySelectorAll<HTMLElement>('[id^="test-"]')].sort((a,b)=>a.offsetTop-b.offsetTop);const current=sections.filter(el=>el.getBoundingClientRect().top<=180).at(-1)??sections[0];if(current)setActive(current.id.replace('test-',''));};
    update();window.addEventListener('scroll',update,{passive:true});
    return ()=>window.removeEventListener('scroll',update);
  }, []);
  return <nav className="section-nav" aria-label="Dossier sections">{tests.map(test => <a key={test.key} href={`#test-${test.key}`} aria-current={active === test.key ? 'location' : undefined}><StatusGlyph result={test.result} label={test.result} /><span className="nav-full">{testLabels[test.key]}</span><span className="nav-short">{{understandable:"U",moat:"Moat",economics:"Econ",management:"Mgmt",accounting:"Acct",price:"Price"}[test.key]}</span></a>)}<a href="#assumptions"><span className="nav-full">Assumptions →</span><span className="nav-short">→</span></a></nav>;
}
