'use client';
import {useState} from 'react';
import dynamic from 'next/dynamic';
import type {Dossier,PriceMap} from '@/lib/value/types';
import {SidePanel} from './SidePanel';
import styles from './PriceStory.module.css';
const loadPanel=()=>import('./PriceStoryPanel');
const Panel=dynamic(()=>loadPanel().then(m=>m.PriceStoryPanel));
export function PriceStory({dossier,quote}:{dossier:Dossier;quote:PriceMap[string]|null}){
 const [open,setOpen]=useState(false);
 if(!dossier.priceStory?.line)return null;
 return <><button className={styles.line} data-testid="price-story-line" aria-label={`Price story: ${dossier.priceStory.line}`} onPointerEnter={()=>void loadPanel()} onFocus={()=>void loadPanel()} onClick={()=>setOpen(true)}>{dossier.priceStory.line} <span aria-hidden="true">↗</span></button>{open&&<SidePanel compact title="Price story" onClose={()=>setOpen(false)}><Panel dossier={dossier} quote={quote}/></SidePanel>}</>;
}
