import { SearchInput } from '@/components/Search';
import { ValueLink } from '@/components/value/ValueLink';
export default function NotFound(){return <section className="not-found-value locks-scroll"><p className="eyebrow">404 · Company not found</p><h1>Find another business.</h1><p>Search by company name or exchange ticker.</p><SearchInput/><ValueLink href="/">← All companies</ValueLink></section>;}
