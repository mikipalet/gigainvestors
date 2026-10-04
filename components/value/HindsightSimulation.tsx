import type { HistoryIndex } from '@/lib/value/time-travel';
import { forwardPercent } from '@/lib/value/forward';
export function HindsightSimulation({history}:{history:HistoryIndex|null}) {
  const years=(history?.years??[]).slice(0,-1);
  return <section><h2>Hindsight simulation, not a track record</h2><p>The method was designed in 2026, after these outcomes were known. The accounts can contain later restatements. The universe uses today’s index membership, creating survivorship bias. These three sources of hindsight can flatter the results.</p><p>The simulation compares median cumulative price gains for each historical buy cohort with all covered companies that year. It excludes dividends and does not represent a rebalanced portfolio.</p>
    {years.length>0 && <div className="forward-table-scroll"><table><thead><tr><th scope="col">Fiscal year</th><th scope="col">Western picks / covered</th><th scope="col">All picks / covered</th></tr></thead><tbody>{years.map(year=>{
      const all=history!.perYear[year],western=history!.western?.perYear[year];
      return <tr key={year}><th scope="row">{year}</th><td data-label="Western picks / covered">{forwardPercent(western?.medianReturnAtBuy??null)} / {forwardPercent(western?.medianReturnAll??null)}</td><td data-label="All picks / covered">{forwardPercent(all?.medianReturnAtBuy??null)} / {forwardPercent(all?.medianReturnAll??null)}</td></tr>;
    })}</tbody></table></div>}
  </section>;
}
