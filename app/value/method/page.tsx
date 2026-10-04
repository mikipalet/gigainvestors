import {METHOD_SECTIONS,METHOD_COPY} from '@/lib/value/method-content';
import {pageAlternates} from '@/lib/agents/urls';
export const metadata={title:'Method and numerical rules | GigaInvestors',description:'The five business quality tests, valuation rules, sources and historical assumptions behind the GigaInvestors checklist.',alternates:pageAlternates('value','/method')};
import { MethodChanges } from '@/components/value/MethodChanges';
import { HindsightSimulation } from '@/components/value/HindsightSimulation';
import { readStore } from '@/lib/value/store';
import type { HistoryIndex } from '@/lib/value/time-travel';
import { MethodRules } from '@/components/value/MethodRules';
import { ValueLink } from '@/components/value/ValueLink';
import { T } from '@/lib/value/config';
export default async function Method() {
 const history=await readStore<HistoryIndex>('history/index.json');
 return <article className="method-page"><ValueLink href="/">← All companies</ValueLink><h1>5 quality tests + price. Every assumption visible.</h1><p>{METHOD_COPY[0]}</p>{METHOD_SECTIONS.map(([id,title,copy])=><section id={id} key={id}><h2>{title}</h2><p>{copy}</p></section>)}<h2>Required discount</h2><p>{METHOD_COPY[1]}</p><h2>Who sets the rules?</h2><p>{METHOD_COPY[2]}</p><MethodChanges/><MethodRules/><HindsightSimulation history={history}/><h2>Sources and uncertainty</h2><p>{METHOD_COPY[3]}</p><p>{METHOD_COPY[4]}</p><p>{METHOD_COPY[5]}</p><p><a href="https://www.sec.gov/edgar/search/">SEC EDGAR ↗</a> · <a href="https://eodhd.com/">EODHD ↗</a></p></article>;
}
