'use client';
import type { ComponentProps } from 'react';
import {useSelectedQuarter,selectedQuarter} from '@/lib/use-quarter';
import { withQuarter } from '@/lib/company-route';
export function QuarterLink({href,...props}:Omit<ComponentProps<'a'>,'href'>&{href:string}){
 const q=useSelectedQuarter();
 return <a {...props} href={withQuarter(href,q)} onClick={event=>{
  props.onClick?.(event);
  event.currentTarget.href=withQuarter(href,selectedQuarter());
 }}/>;
}
