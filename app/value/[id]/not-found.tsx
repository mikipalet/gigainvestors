import { getDefaultIndex, getMeta } from '@/lib/value/store';
import { NotFoundRecovery } from '@/components/value/NotFoundRecovery';

export default async function NotFound() {
  const [rows, meta] = await Promise.all([getDefaultIndex(), getMeta()]);
  return <NotFoundRecovery companies={rows.map(({id,n})=>({id,n}))} analysed={meta?.counts.analysed ?? (meta ? meta.counts.scored + meta.counts.insufficient : 0)} universe={meta?.counts.universe ?? 0} />;
}
