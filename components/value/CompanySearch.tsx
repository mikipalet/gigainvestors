'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { valueHref } from '@/lib/value/href';
export function CompanySearch({ initial = '', companies = [] }: { initial?: string; companies?: Array<{id:string;n:string}> }) {
  const [query, setQuery] = useState(initial);
  const router = useRouter(), pathname = usePathname();
  return <form className="company-search" role="search" onSubmit={e => { e.preventDefault(); const input = query.trim().toLowerCase(); const id = companies.find(c=>c.n.toLowerCase()===input)?.id.toLowerCase() ?? input; if (/^[a-z0-9&.-]+$/.test(id)) router.push(valueHref(`/${id.includes('.') ? id : `${id}.us`}`, pathname)); }}>
    <label className="sr-only" htmlFor={initial ? 'recovery-search' : 'company-search'}>Find a company by ticker</label>
    <input id={initial ? 'recovery-search' : 'company-search'} value={query} onChange={e => setQuery(e.target.value)} list={initial ? undefined : "company-options"} placeholder="Find a company · ticker" autoComplete="off" />
    {!initial && <datalist id="company-options">{companies.map(c=><option key={c.id} value={c.n}>{c.id}</option>)}</datalist>}
    <button type="submit" aria-label="Open company">↗</button>
  </form>;
}
