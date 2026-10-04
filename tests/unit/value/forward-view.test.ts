import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { ForwardLine } from '@/components/value/ForwardLine';
import { ForwardRecord } from '@/components/value/ForwardRecord';
import { MethodChanges } from '@/components/value/MethodChanges';
import { HindsightSimulation } from '@/components/value/HindsightSimulation';
import { computeForwardRecord } from '@/lib/value/forward';
vi.mock('next/navigation',()=>({usePathname:()=>'/value'}));
it('renders no home line before 30 recorded days and scopes the mature line',()=>{
 const record=computeForwardRecord([]);
 expect(renderToStaticMarkup(createElement(ForwardLine,{record,scope:'western'}))).toBe('');
 record.days=29;
 expect(renderToStaticMarkup(createElement(ForwardLine,{record,scope:'all'}))).toBe('');
 record.days=30;record.western.priceReturn=.1;record.all.priceReturn=.2;
 const western=renderToStaticMarkup(createElement(ForwardLine,{record,scope:'western'}));
 expect(western).toContain('Western markets');expect(western).toContain('+10%');expect(western).not.toContain('+20%');
 expect(renderToStaticMarkup(createElement(ForwardLine,{record,scope:'all'}))).toContain('+20%');
});
it('states the record has not begun without inventing a start date',()=>{
 const html=renderToStaticMarkup(createElement(ForwardRecord,{record:computeForwardRecord([])}));
 expect(html).toContain('first published daily snapshot');expect(html).not.toContain('2026-10-01');
});
it('shows version history and explains in-sample design and the three hindsight biases',()=>{
 const changes=renderToStaticMarkup(createElement(MethodChanges));
 expect(changes).toContain('3.0.0');expect(changes).toContain('1 Oct 2026');expect(changes).toContain('never to improve past returns');expect(changes).toContain('in-sample');
 const simulation=renderToStaticMarkup(createElement(HindsightSimulation,{history:null}));
 expect(simulation).toContain('Hindsight simulation, not a track record');
 for(const bias of ['designed in 2026','restatements','today’s index membership'])expect(simulation).toContain(bias);
});
