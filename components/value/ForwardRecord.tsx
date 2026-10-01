import { forwardPercent, type ForwardRecord as RecordData } from '@/lib/value/forward';
import { ValueLink } from './ValueLink';

export function ForwardRecord({ record }: { record: RecordData }) {
  return <section className="forward-record">
    <h1>Forward record</h1>
    {!record.start ? <p>The record begins with the first published daily snapshot.</p> : <>
      <p>{record.days} days since {record.start}. {record.snapshots} snapshots; latest {record.asOf}.</p>
      <p>Each pick enters at its first recorded quote. We keep every pick and rebalance equally at each snapshot, adding new picks for the following interval. The benchmark rebalances equally across that snapshot’s full index universe. No picks means cash with zero return.</p>
      <p>Each snapshot uses the latest available close, which can precede the snapshot date. Returns are cumulative in each listing’s currency, with recorded share splits accounted for. They exclude currency conversion, trading costs and taxes. Dividend-inclusive returns use a comparable dividend-reinvested index when available. Missing quotes or dividend coverage remain unavailable; companies are never silently dropped.</p>
      <div className="forward-table-scroll"><table><caption>Equal-weight portfolios since {record.start}</caption><thead><tr><th scope="col">Markets</th><th scope="col">Picks: price</th><th scope="col">Index universe: price</th><th scope="col">Picks: dividends included</th><th scope="col">Index universe: dividends included</th></tr></thead><tbody>
        {(['western','all'] as const).map(scope=><tr key={scope}><th scope="row">{scope==='western'?'Western':'All'}</th><td>{forwardPercent(record[scope].priceReturn)}</td><td>{forwardPercent(record[scope].benchmarkPriceReturn)}</td><td>{forwardPercent(record[scope].dividendReturn)}</td><td>{forwardPercent(record[scope].benchmarkDividendReturn)}</td></tr>)}
      </tbody></table></div>
      {record.all.missingIds.length>0 && <p>Missing comparable prices: {record.all.missingIds.join(', ')}.</p>}
      <h2>Every pick since first appearance</h2>
      {record.picks.length===0 ? <p>No buy-zone picks recorded yet.</p> : <div className="forward-table-scroll"><table><thead><tr><th scope="col">Company</th><th scope="col">First picked</th><th scope="col">Markets at entry</th><th scope="col">Method at entry</th><th scope="col">Latest quote</th><th scope="col">Price return</th><th scope="col">Dividends included</th></tr></thead><tbody>
        {record.picks.map(pick=><tr key={pick.id}><th scope="row">{pick.name} <small>{pick.id}</small></th><td>{pick.firstDate}</td><td>{pick.western?'Western + all':'All'}</td><td>{pick.methodVersion}</td><td>{pick.priceDate??'unavailable'}</td><td>{forwardPercent(pick.priceReturn)}</td><td>{forwardPercent(pick.dividendReturn)}</td></tr>)}
      </tbody></table></div>}
    </>}
    <p><ValueLink href="/method">Method changes and limitations ↗</ValueLink></p>
  </section>;
}
