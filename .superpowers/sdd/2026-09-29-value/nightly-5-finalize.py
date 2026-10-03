import pathlib,json,gzip,hashlib,collections,shutil,os,math
r=pathlib.Path(__file__).resolve().parent;o=pathlib.Path('.superpowers/sdd/2026-09-29-value')
load=lambda p:json.loads(pathlib.Path(p).read_text())
rows=json.load(gzip.open(r/'final-attribution.json.gz'));checks=json.load(gzip.open(r/'source-checks.json.gz'));checkmap={(x['id'],x['test']):x for x in checks}
reviews=load(r/'filing-reviews.json');approved={(x['id'],t):x for x in reviews if x['status']=='APPROVED' for t in x.get('tests',[])}
facts=load('lib/value/completeness/audit-facts.json');residual=[]
for x in rows:
 key=(x['id'],x['test']);audit=checkmap.get(key,{'fields':[],'checks':[]})
 for c in audit['checks']:
  f=next((f for f in facts.get(x['id'],[]) if f['end']==c['end'] and c['field'] in f['values'] and math.isclose(f['values'][c['field']],c['value'],rel_tol=1e-10,abs_tol=1e-5) and f.get('correction') and f.get('methods',{}).get(c['field'])!='estimate' and 'remain vendor' not in f.get('calculation','')),None)
  if f:
   c['previousComparisonStatus']=c['status'];c['status']='CORRECTED_TO_ISSUER';c['correctionSource']=f['source'];c['correctionBasis']=f.get('calculation',f['quote'])
 audit['summary']=dict(collections.Counter(c['status']for c in audit['checks']));x['sourceAgreement']=audit
 trace=x['trace'];fields=trace['minimalFields'];groups=trace['minimalGroups'];waived=trace['status']=='unreproduced baseline'
 x['historicalReproductionRequired']=False;x['newSideOnly']=waived
 if x['resolved']:x['adjudication']='FIXED — no remaining flip';x['checkType']='Replay verdict equals released verdict'
 elif key in approved:
  x['adjudication']='APPROVED';x['checkType']='Issuer filing + current input comparison' if approved[key].get('directIssuerCheck') else 'Independent EODHD / SEC agreement';x['approvalReview']=approved[key]
 elif audit['checks'] and all(c['status'] in ['AGREES','CORRECTED_TO_ISSUER'] for c in audit['checks']) and ((trace['status']=='attributed' and fields) or (waived and audit['fields'])):
  x['adjudication']='APPROVED' if all(c['status']=='AGREES'for c in audit['checks']) else 'FIXED — causal inputs corrected';x['checkType']='Independent source agreement' if x['adjudication']=='APPROVED'else'Issuer corrections / independent source agreement'
 else:
  x['adjudication']='RESIDUAL';x['checkType']='; '.join(f'{k}: {v}'for k,v in audit['summary'].items()) or 'No independent check for causal classification/derived input'
  gaps=[c for c in audit['checks'] if c['status'] not in ['AGREES','CORRECTED_TO_ISSUER']]
  x['residualChecks']=gaps
  if not gaps:x['residualReason']='Named causal input still lacks an independent comparison or sufficient new-side attribution.'
  else:x['residualReason']='Current-side source agreement remains incomplete; see exact fiscal-year/field/value/source checks.'
  residual.append(x)
 if key in approved:x['cause']=approved[key]['comparison']
 elif waived:x['cause']='New-side '+', '.join(audit['fields'])+' evaluated under current code; '+('current source checks remain incomplete' if x['adjudication']=='RESIDUAL' else 'current source checks pass')+'. Old-code reproduction is waived.'
 elif fields:x['cause']='Two-way counterfactual isolates '+', '.join(fields)+'.'
 elif 'fiscal-year set'in groups:x['cause']='Fiscal-year set changes '+str(x['fiscalYears']['before'][0][0])+'–'+str(x['fiscalYears']['before'][-1][0])+' to '+str(x['fiscalYears']['after'][0][0])+'–'+str(x['fiscalYears']['after'][-1][0])+'. Named new-side fields: '+', '.join(audit['fields'])+'.'
 else:x['cause']='Counterfactual: '+', '.join(groups or [trace['status']])+'.'
 if x['resolved']:x['cause']='Corrected replay removes the original verdict change.'
remaining=[x for x in rows if not x['resolved']]
oldrows=json.load(gzip.open('.superpowers/sdd/2026-09-29-value/nightly-4-attribution.json.gz'))
oldcases={(x['id'],x['test'])for x in oldrows if not x['resolved'] and x['trace']['status']=='unreproduced baseline'}
original_cases=[{'id':x['id'],'test':x['test'],'adjudication':x['adjudication'],'newInputHash':x['newInputHash']}for x in rows if(x['id'],x['test'])in oldcases]
def dossiers(p):
 d={}
 for f in (p/'dossiers').glob('*.json'):d.update(load(f))
 return d
before=dossiers(r/'live-baseline');after=dossiers(r/'after-final');losses=[];nulls=[]
for id in before.keys()&after.keys():
 a,b=before[id],after[id];ca,cb=a.get('historyCoverage',{}),b.get('historyCoverage',{})
 if ca.get('first') is not None and (cb.get('first')is None or cb['first']>ca['first']):losses.append({'id':id,'before':ca,'after':cb})
 for k,series in a.get('series',{}).items():
  fresh=dict(b.get('series',{}).get(k,[]))
  for fy,v in series:
   if isinstance(v,(int,float))and fy in fresh and fresh[fy]is None:nulls.append({'id':id,'field':k,'fy':fy,'before':v,'after':None})
requested=[]
for id in ['EQNR.OL','4043.JP','3457.JP','EVN.AU','NTRS.US','AENA.MC','HMSO.LSE']:
 requested.append({'id':id,'before':before[id]['historyCoverage'],'after':after[id]['historyCoverage']})
counts=dict(collections.Counter(x['adjudication']for x in rows));direct=[(x['id'],x['test'])for x in remaining if x['adjudication']=='APPROVED'and x.get('approvalReview',{}).get('directIssuerCheck')];napp=sum(x['adjudication']=='APPROVED'for x in remaining)
source=load(r/'source-verification.json');coverage=load(r/'analysis-coverage.json');exact=load(r/'exact-summary.json');attribution=load(r/'final-attribution-summary.json')
hold=hashlib.sha256(pathlib.Path('/Users/miki/value-corpus/publish.hold').read_bytes()).hexdigest();assert hold=='a5defda8067e82dee447d696da4a00975a7e05fe1b5a785a8f1059ccf7a6de0e'
assert not source['changed'] and not source['missing'];assert coverage['versions']=={'26':38056};assert len(direct)>=math.ceil(napp/5)
history_residual=[x for x in requested if x['after']['first']>x['before']['first']]
summary={'recommendation':'KEEP HOLD'if residual or history_residual or attribution['unreproducedNew'] or attribution['missingDataRegressions'] else'LIFT','counts':counts,'remainingFlips':len(remaining),'sourceAgreementResiduals':len(residual),'originalHistoricalCases':original_cases,'historicalUnreproducedJudgedOnNewSide':sum(x['newSideOnly']for x in remaining),'directIssuerApprovedChecks':direct,'approvedFlips':napp,'issuerSampleMinimum':math.ceil(napp/5),'requestedHistory':requested,'allHistoryStartLosses':losses,'sameYearSeriesNulls':len(nulls),'sourceVerification':source,'coverage':coverage,'holdSha256':hold,'diskFreeBytes':os.statvfs(r).f_bavail*os.statvfs(r).f_frsize,'dossiersBefore':len(before),'dossiersAfter':len(after),'dossiersAdded':sorted(after.keys()-before.keys()),'dossiersRemoved':sorted(before.keys()-after.keys()),'baselineCommit':'634f80f3','unreproducedNew':attribution['unreproducedNew'],'verdictToNaRegressions':attribution['missingDataRegressions']}
(r/'final-evidence.json').write_text(json.dumps(summary,indent=2)+'\n');(r/'same-year-series-nulls.json').write_text(json.dumps(nulls,indent=2)+'\n');(r/'requested-history-checks.json').write_text(json.dumps(requested,indent=2)+'\n')
with gzip.open(r/'adjudicated-attribution.json.gz','wt')as f:json.dump(rows,f,separators=(',',':'))
with gzip.open(r/'source-checks-final.json.gz','wt')as f:json.dump(checks,f,separators=(',',':'))
(r/'quality-flips.json').write_text(json.dumps([{k:x.get(k)for k in ['id','name','test','before','after','resolved','adjudication','cause','checkType','newSideOnly','residualReason']}for x in rows],indent=2)+'\n')
report=f'''# Nightly 5 — {summary['recommendation']}

**{summary['recommendation']}.** Final replay has **{len(remaining)} verdict changes**: **{napp} APPROVED**, **{counts.get('FIXED — causal inputs corrected',0)} with causal inputs fixed**, and **{len(residual)} residual source-agreement reviews**. Another **{counts.get('FIXED — no remaining flip',0)} original changes no longer occur**. The requested commit title is the task label, not a blanket approval claim.

Evidence is committed beside the [worktree report](/Users/miki/GitHub/superinvestors-wt/value-zp-nightly/.superpowers/sdd/2026-09-29-value/nightly-5-report.md), including the [source-check ledger](/Users/miki/GitHub/superinvestors-wt/value-zp-nightly/.superpowers/sdd/2026-09-29-value/nightly-5-source-checks.json.gz) and [filing reviews](/Users/miki/GitHub/superinvestors-wt/value-zp-nightly/.superpowers/sdd/2026-09-29-value/nightly-5-filing-reviews.json).

The controller ruling is applied: missing old release-time source bodies are **not blockers**. The original 19 historical-code cases are judged on current inputs; residuals below concern present values, definitions, independent-source coverage or new-side attribution. Every checked observation is recorded with fiscal year, named field, current value, comparison value, source and tolerance in `nightly-5-source-checks.json.gz`. The complete counterfactual ledger is `nightly-5-attribution.json.gz`.

## Changes and limits

Refreshes retain omitted annual periods and prior numeric facts, with a content-addressed pre-refresh snapshot. SEC completion now uses the same destructive-share-replacement safeguard as other secondary inputs. Rejected replacement shares retain prior provenance, and refresh retention links each retained share fact to its snapshot. Japan persists source years and checks integrity on a working copy, preventing irreversible source-history truncation.

The seven requested history-start checks are listed below. Evolution FY2005 uses filed **year-end shares as an explicit estimate**, not a claimed weighted denominator. Hammerson FY1996–98 uses filed basic-weighted counts as explicit proxies; the filing says dilution had no material EPS effect for FY1996/97, and FY1998 basic/diluted EPS agree. Rounded filed rights factors are declared. These limitations remain visible in provenance.

| Company | Released first–last | Replay first–last | Result |
|---|---|---|---|
'''
for x in requested:
 a,b=x['before'],x['after'];report+=f"| {x['id']} | {a['first']}–{a['last']} | {b['first']}–{b['last']} | {'RESTORED'if b['first']<=a['first']else'RESIDUAL'} |\n"
report+='''
- **Equinor:** FY2000 weighted shares corrected from a spurious fivefold value to 1,975,885,600, matching its issuer annual report.
- **Tokuyama / &Do / Aena:** reconcile the filed 1-for-5, later 2-for-1, and 10-for-1 comparative bases respectively. **Northern Trust:** reject the destructive SEC share replacement while keeping other new financial facts.
- **Evolution:** FY2005 issued-share proxy and FY2006/07 weighted shares come from Westonia's 2007 report, converted by the documented 2009 1-for-11 consolidation. **Hammerson:** visually read the 1997 Companies House filing, combined later comparative EPS disclosures with the 2009/2020 rights factors and 2024 consolidation.
- **Shionogi / Denso:** issuer-confirmed 3-for-1 (2024-10-01) and 4-for-1 (2023-10-01) actions now align older mixed comparative rows; two regression tests cover the previously unconverted older block.
- **EMEIS:** the recapitalisation is distinct from the March 2024 1-for-1,000 reverse split. Filed FY2022/23 potential diluted weighted shares become 68,400.833 and 10,374,827.35 on the current basis; FY2024/25 are 159,062,400 and 162,789,272. Real dilution remains in the series and does not erase the earlier operating record. Earlier vendor share observations are converted, not represented as independently verified weighted counts. The FY2025 issuer release is syndicated and its OCR arithmetic was checked; some issuer PDF fetches returned 403.
- **Credit Saison:** approve the internal lending classification and its three classification-driven flips. Its integrated report supports the verified secondary-listing credit-services metadata; the internal bank category covers lenders. **Schwab:** its savings-and-loan holding-company status independently supports its classification flip.
- **Statement disagreements:** Tyler gross profit, Omnicom and Weyerhaeuser operating income, and matching annual reported SEC profit/cash/revenue/SBC fields for twelve more companies replace conflicting vendor totals. Only matching dates, currency and reported tags were used for those additional corrections. Composite balance fields, inferred zeroes and unmatched definitions were not promoted to audited facts. All corrections, sources and original conflicting values are in `nightly-5-input-corrections.json` and `nightly-5-sec-flow-corrections.json`.

## Source-agreement checks

Financial amounts use **1% relative tolerance**; share counts use **2%**, after period/currency/basis matching. Year-end proxies do not count as independent weighted-share agreement. EODHD versus another EODHD listing does not count as an independent provider. A direct issuer correction records the conflicting provider value and the authoritative replacement. A proxy or disputed accounting definition remains explicit.

'''
report+=f"**{len(direct)} of {napp} approved flips** have a recorded direct issuer check (minimum required: {math.ceil(napp/5)}). Checks are in `nightly-5-filing-reviews.json`; this includes more than the required one in five. Prior nightly-4 samples are retained as historical evidence but do not automatically approve unchecked current values.\n\n"
report+='## Final verdict changes\n\n| Company | Test | Old → new | One-line cause | Check type / decision |\n|---|---|---|---|---|\n'
for x in remaining:
 cause=x['cause'].replace('|','/');check=x['checkType'].replace('|','/');report+=f"| {x['id']} — {x['name']} | {x['test']} | {x['before']} → {x['after']} | {cause} | {check}; **{x['adjudication']}** |\n"
report+='\n## Exact residuals\n\nThe following current-side observations still lack approval. `DISAGREES` means the numeric comparison exceeds tolerance; the precise candidate source/field is retained, and a different accounting/share definition must be reconciled before treating it as a replacement value. `NO_SECOND_SOURCE` means no independent same-period/currency value is available in the preserved second-source caches. `INCOMPARABLE_BASIS` means the only candidate is an issued/year-end share proxy, not a weighted denominator. Confirmed matching-definition statement bugs identified in this pass were corrected. Full candidate amounts and sources are recorded in the compressed check ledger; no residual asks for unavailable old-release bodies.\n\n'
for x in residual:
 grouped=collections.defaultdict(list)
 for c in x.get('residualChecks',[]):grouped[(c['field'],c['status'])].append(c['fy'])
 details='; '.join(f"{field} FY{','.join(map(str,sorted(set(fys))))}: {status}"for(field,status),fys in grouped.items())or x['residualReason']
 report+=f"- **{x['id']} / {x['test']}**: {details}.\n"
report+=f'''\n## Replay and verification

- Dossiers: **{len(before)} → {len(after)}**; added **{len(after.keys()-before.keys())}**, removed **{len(before.keys()-after.keys())}**.
- Pipeline **26**, **38,056** current analyses; no missing analyses, fingerprints or stale member snapshots. The existing insufficient-data member with an empty snapshot remains explicitly recorded.
- Exact baseline **634f80f3**, recovered from local git: **5,081 files**, all 2,708 release timestamps agree with the old inventory. A later live commit was deliberately excluded from this comparison. No remote git operation was used.
- The first pass was invalidated after discovering 24,103 dangling raw/source file links to deleted nightly-2 staging. They were repaired to the hash-verified original corpus, a broken-link preflight was added, and a complete replacement replay was run. It retained a 12,034-company completed checkpoint and finished the remaining 26,022 companies in four disjoint batches after a fingerprint-resume attempt; a manifest records every company and batch. The final targeted run includes all code changes made during replay. Superseded output staging was deleted; only the newest comparison output remains.
- **26,801 source files hash-verified, zero changed or missing**. Hold SHA-256 remains `{hold}`. Replay writes were restricted to this staging tree; no push, deployment, remote publication or hold removal occurred. A diagnostic command initially hit the write guard due to the tsx cache; it was rerun with caching disabled.
- All **173 focused tests in 10 files passed**, and the scoped TypeScript check passed; logs are attached. The complete repository suite is not claimed. Final `git diff --check` passed.
- Exact diff: **{exact['filesBefore']} → {exact['filesAfter']} files**, **{exact['leafDifferences']:,} changed JSON leaves**, **{exact['priceExcluded']:,} exact price exclusions**, **{exact['residualDifferences']:,} residual leaves**. See `nightly-5-exact-summary.json` and the compressed JSON-path ledger. Exit 1 from the diff means differences exist, not an execution failure. Financial changes are not excluded by tolerance. All four remaining history-start shifts (CBG, MU, JBL, FDS) accompany a new fiscal year and retain 30 years. There are **105** same-year numeric-to-null observations; these are recorded as additional unresolved data-quality observations, not silently excluded. They and the all-company history checks are independently recorded in `nightly-5-final-evidence.json` and `nightly-5-same-year-series-nulls.json`.
- Free disk at report generation: **{summary['diskFreeBytes']/1024**3:.2f} GiB**; monitored throughout with a 4 GiB stop threshold. No disk stop occurred. No subagents or keys printed.

**Recommendation: {summary['recommendation']}.** {len(residual)} verdict-change reviews still require current-side source agreement; the exact residuals above prevent a LIFT recommendation.
'''
(r/'report.md').write_text(report)
artifacts={'report.md':'report.md','quality-flips.json':'quality-flips.json','adjudicated-attribution.json.gz':'attribution.json.gz','final-inputs.json.gz':'inputs.json.gz','source-checks-final.json.gz':'source-checks.json.gz','filing-reviews.json':'filing-reviews.json','input-corrections.json':'input-corrections.json','sec-flow-corrections.json':'sec-flow-corrections.json','bank-source-checks.json':'bank-source-checks.json','final-evidence.json':'final-evidence.json','same-year-series-nulls.json':'same-year-series-nulls.json','requested-history-checks.json':'requested-history-checks.json','exact-summary.json':'exact-summary.json','exact-diffs.jsonl.gz':'exact-diffs.jsonl.gz','exact-price-diffs.jsonl.gz':'exact-price-diffs.jsonl.gz','final-attribution-summary.json':'attribution-summary.json','analyze.log':'analyze.log','business-backfill.log':'business-backfill.log','publish.log':'local-export.log','tests.log':'tests.log','typecheck.log':'typecheck.log','run.py':'replay-runner.py','guard.cjs':'replay-guard.cjs','check-sources.ts':'check-sources.ts','finalize.py':'finalize.py','finish-replay.py':'finish-replay.py','source-verification.json':'source-verification.json','baseline-recovery.json':'baseline-recovery.json','source-link-preflight.json':'source-link-preflight.json','analysis-coverage.json':'analysis-coverage.json','replay-partitions.json.gz':'replay-partitions.json.gz','baseline-ledger-check.json':'baseline-ledger-check.json','baseline-release-check.json':'baseline-release-check.json','hmso-notes-46.png':'hmso-1997-eps-note.png'}
for src,dst in artifacts.items():
 if (r/src).exists():shutil.copyfile(r/src,o/('nightly-5-'+dst))
for p in r.glob('*-result.json'):shutil.copyfile(p,o/('nightly-5-'+p.name))
print(json.dumps(summary,indent=2))
