'use client';
import {useEffect,useState,type ComponentProps} from 'react';
import {createPortal} from 'react-dom';
import {QuarterSlider} from './QuarterSlider';
export function Timeline(props:ComponentProps<typeof QuarterSlider>){
 const [slot,setSlot]=useState<HTMLElement|null>(null);
 useEffect(()=>setSlot(document.getElementById('value-timeline')),[]);
 return slot?createPortal(<QuarterSlider {...props} embedded globalKeys/>,slot):null;
}
