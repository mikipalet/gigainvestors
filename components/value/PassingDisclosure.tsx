'use client';
import { useEffect, useState, type ReactNode } from 'react';
export function PassingDisclosure({passing,summary,children}: {passing:boolean;summary:string;children:ReactNode}) {
 const [open,setOpen]=useState(true);
 return <details className="passing-disclosure" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>{summary}</summary>{children}</details>;
}
