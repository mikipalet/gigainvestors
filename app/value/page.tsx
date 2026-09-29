import { getDefaultIndex, getMeta } from '@/lib/value/store';
import ValueIndex from './ValueIndex';
export const revalidate = 86400;
export default async function ValuePage() {
  const [meta, rows] = await Promise.all([getMeta(), getDefaultIndex()]);
  return <ValueIndex rows={rows} initialFilter={{}} tags={meta?.tags ?? {}} meta={meta} />;
}
