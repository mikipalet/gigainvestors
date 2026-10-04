import {headers} from 'next/headers';
import {robotsPolicy} from '@/lib/agents/robots';
import {requestSite} from '@/lib/agents/urls';
export default async function robots(){return robotsPolicy(requestSite(new Request('https://gigainvestors.com',{headers:await headers()})));}
