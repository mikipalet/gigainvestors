'use client';
export function Toggle({label,checked,onChange}:{label:string;checked:boolean;onChange:()=>void}) {
 return <button type="button" className="design-toggle" role="switch" aria-checked={checked} onClick={onChange}><i aria-hidden="true"/><span>{label}</span></button>;
}
