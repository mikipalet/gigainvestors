import {markdownUrl} from '@/lib/agents/urls';
/** React owns this head link, so streamed metadata cannot restore a stale quarter. */
export function AgentQuarterMetadata({canonical,quarter}:{canonical:string;quarter?:string}) {
 const url=new URL(canonical);
 if(quarter)url.searchParams.set('q',quarter);
 return <link rel="alternate" type="text/markdown" href={markdownUrl(url.toString())}/>;
}
