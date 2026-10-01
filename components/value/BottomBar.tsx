"use client";
import { SearchTrigger } from '@/components/Search';
import { AboutMethod } from './AboutMethod';
import { ValueLink } from './ValueLink';
export function BottomBar(){return <nav className="value-dock" aria-label="Time travel and tools"><div id="value-timeline"><ValueLink className="dock-home" href="/">← Companies</ValueLink></div><div className="dock-tools"><div id="value-market"/><SearchTrigger value/><AboutMethod/><a href="https://gigainvestors.com">Portfolios ↗</a></div></nav>}
