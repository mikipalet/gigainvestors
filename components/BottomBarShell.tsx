'use client';
import type {ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {SearchTrigger} from './Search';
import {VALUE_PRODUCT_NAME} from '@/lib/value/brand';
import {QuarterLink} from './QuarterLink';
export function BottomBarShell({method,investorCodes,timelineCodes}:{method:ReactNode;investorCodes:string[];timelineCodes:string[]}){
 const path=usePathname();
 const investor=investorCodes.includes(path.slice(1));
 const value=path==='/value'||path.startsWith('/value/');
 const company=path.startsWith('/s/');
 const hasTimeline=path==='/'||path==='/value'||path.startsWith('/value/year/')||timelineCodes.includes(path.slice(1));
 return <nav className="value-viz value-page value-dock site-dock" aria-label="Site tools" data-timeline={hasTimeline} data-investor={investor}>
  <div id="value-timeline" hidden={!hasTimeline}/>
  <div className="dock-tools">
   {path!=='/'&&!investor&&<QuarterLink href="/">GigaInvestors</QuarterLink>}
   {path!=='/value'&&<QuarterLink href="/value">{VALUE_PRODUCT_NAME}</QuarterLink>}
   <SearchTrigger/>
   {(value||company)&&method}
   <QuarterLink href="/newsletter">Newsletter</QuarterLink>
   <a href="/api/v1/guide">Agent API</a>
   <a href="mailto:hello@gigainvestors.com">Contact</a>
  </div>
 </nav>;
}
