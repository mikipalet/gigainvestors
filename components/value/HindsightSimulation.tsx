import {HISTORY_POPULATION_COPY,HISTORY_RETURN_COPY} from '@/lib/value/history-copy';
import type { HistoryIndex } from '@/lib/value/time-travel';
import { forwardPercent } from '@/lib/value/forward';
export function HindsightSimulation({history}:{history:HistoryIndex|null}) {
  const years=(history?.years??[]).slice(0,-1);
  return <section><h2>Hindsight simulation, not a track record</h2><p>The method was designed in 2026, after these outcomes were known. The accounts can contain later restatements. These sources of hindsight can flatter the results.</p><p>{HISTORY_POPULATION_COPY}</p><p>{HISTORY_RETURN_COPY}</p><p>This table compares median price gains for buy-qualified picks with all analysed index companies with available returns in the same year-end quarter and market scope.</p>
    {years.length>0 && <div className="forward-table-scroll"><table><thead><tr><th scope="col">Year-end quarter</th><th scope="col">Western picks / index</th><th scope="col">All markets picks / index</th></tr></thead><tbody>{years.map(year=>{
      const all=history!.perYear[year],western=history!.western?.perYear[year];
      return <tr key={year}><th scope="row">{year}</th><td data-label="Western picks / index">{forwardPercent(western?.medianReturnAtBuy??null)} / {forwardPercent(western?.medianReturnAll??null)}</td><td data-label="All markets picks / index">{forwardPercent(all?.medianReturnAtBuy??null)} / {forwardPercent(all?.medianReturnAll??null)}</td></tr>;
    })}</tbody></table></div>}
  </section>;
}
