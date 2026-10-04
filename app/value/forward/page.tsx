export const metadata = {alternates:{canonical:'https://gigainvestors.com/value/forward'}};
import { ForwardRecord } from '@/components/value/ForwardRecord';
import { ValueLink } from '@/components/value/ValueLink';
import { getForwardRecord } from '@/lib/value/store';
export const revalidate = 86400;
export default async function ForwardPage() {
  const record = await getForwardRecord();
  return <article className="method-page"><ValueLink href="/">← All companies</ValueLink><ForwardRecord record={record}/></article>;
}
