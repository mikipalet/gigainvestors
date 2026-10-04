'use client';
import type {ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {InvestorSearchTools} from './InvestorSearchTools';
import {SearchTrigger} from './Search';
import {QuarterSlider} from './QuarterSlider';
import {useQuarter} from '@/lib/use-quarter';
import {VALUE_PRODUCT_NAME} from '@/lib/value/brand';
import {QuarterLink} from './QuarterLink';
function DefaultTimeline({quarters}:{quarters:string[]}){const[q,setQ]=useQuarter(quarters);return <QuarterSlider embedded globalKeys quarters={quarters} q={q} onChange={setQ}/>;}
export function BottomBarShell({method,quarters,investorCodes}:{method:ReactNode;quarters:string[];investorCodes:string[]}){
 const path=usePathname(),value=path==='/value'||path.startsWith('/value/')||path.startsWith('/s/');
 if(investorCodes.includes(path.slice(1)))return <InvestorSearchTools/>;
 const company=path.startsWith('/s/');
 const hasTimeline=path==='/'||path==='/value'||path.startsWith('/value/year/')||path.startsWith('/s/')||investorCodes.includes(path.slice(1));
 return <nav className="value-viz value-page value-dock shared-dock" aria-label={company?'Tools':'Time travel and tools'}>{!company&&<div id="value-timeline">{!hasTimeline&&quarters.length>0&&<DefaultTimeline quarters={quarters}/>}</div>}<div className="dock-tools"><QuarterLink href={path==='/value'?'/':'/value'}>{path==='/value'?'GigaInvestors':VALUE_PRODUCT_NAME}</QuarterLink><SearchTrigger/>{value&&method}<QuarterLink href="/newsletter">Newsletter</QuarterLink><a href="/api/v1/guide">Agent API</a><a href="mailto:hello@gigainvestors.com">Contact</a></div></nav>;
}
