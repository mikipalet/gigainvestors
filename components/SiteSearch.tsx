"use client";
import { usePathname } from 'next/navigation';
import { Search } from './Search';
import { Search as InvestorSearch } from './investor-legacy/Search';
export function SiteSearch({investorCodes}:{investorCodes:string[]}) {
 const path = usePathname();
 return investorCodes.includes(path.slice(1)) ? <InvestorSearch /> : <Search />;
}
