"""Per-flip gate: a candidate mechanism is not a filing-backed justification."""
import pathlib,json,collections,gzip
r=pathlib.Path(__file__).resolve().parent
def read(name):return json.loads((r/name).read_text())
def dossiers(root):
 result={}
 for p in (root/'dossiers').glob('*.json'):result.update(json.loads(p.read_text()))
 return result
before=dossiers(r.parent/'nightly-2/live-current');after=dossiers(r/'after-publish')
original={(x['id'],x['test']):x for x in read('original-flips.json')}
groups={(x['id'],x['test']):x for x in read('unchanged-source-groups.json')}
reviews=read('filing-reviews.json');exact=read('exact-summary.json')
approved={('2269.JP','management'):('fail','pass'),('4507.JP','management'):('fail','pass'),('6902.JP','management'):('fail','pass'),('CBG.LSE','understandable'):('pass','fail'),('CBG.LSE','moat'):('pass','fail')}
ledger=[]
for flip in exact['testFlips']:
 if flip['test']=='price':continue
 id,test=flip['id'],flip['test'];key=(id,test);old=before[id]['tests'][test];new=after[id]['tests'][test]
 certified=approved.get(key)==(flip['before'],flip['after'])
 # The filing review covers the previously inspected metric window, not arbitrary future outcomes.
 if certified:
  inspected=original.get(key)
  certified=bool(inspected and inspected['new']['metrics']==new['metrics'])
 group=groups.get(key);o=original.get(key);review=reviews.get(id)
 ledger.append({**flip,'sourceCohort':o['cohort'] if o else 'new in final replay',
  'candidateCause':group['group'] if group else 'refreshed source/completion basis' if o else 'new final-code effect; requires attribution',
  'adjudication':'FILING-BACKED: live wrong or stale' if certified else 'UNEXPLAINED',
  'filingReview':review,'blockingReason':None if certified else 'The exact scoring-window inputs and resulting verdict have not been reconciled to primary filings.',
  'beforeMetrics':old.get('metrics'),'afterMetrics':new.get('metrics'),'beforeReasons':old.get('reasons'),'afterReasons':new.get('reasons')})
(r/'quality-flip-ledger.json').write_text(json.dumps(ledger,indent=2)+'\n')
disposition=[]
for key,x in groups.items():
 id,test=key;new=after.get(id,{}).get('tests',{}).get(test,{}).get('result')
 l=next((v for v in ledger if (v['id'],v['test'])==key),None)
 disposition.append({'id':id,'test':test,'live':x['before'],'nightly2':x['after'],'nightly3':new,'candidateCause':x['group'],'disposition':l['adjudication'] if l else 'REMOVED DOSSIER' if id not in after else 'NO REMAINING FLIP','filingReview':reviews.get(id)})
(r/'original-105-disposition.json').write_text(json.dumps(disposition,indent=2)+'\n')
nulls=[]
for id in before.keys()&after.keys():
 for field,old in before[id].get('series',{}).items():
  new=after[id].get('series',{}).get(field,[])
  if not isinstance(old,list) or not isinstance(new,list):continue
  mapping={v[0]:v[1] for v in new if isinstance(v,list) and len(v)==2}
  for v in old:
   if isinstance(v,list) and len(v)==2 and isinstance(v[1],(int,float)) and v[0] in mapping and mapping[v[0]] is None:
    nulls.append({'id':id,'field':field,'fy':v[0],'before':v[1],'after':None,'adjudication':'UNEXPLAINED source/basis loss; live value is not approved restoration evidence'})
(r/'same-year-series-nulls.json').write_text(json.dumps(nulls,indent=2)+'\n')
summary={'decision':'KEEP HOLD','zeroUnexplained':not any(x['adjudication']=='UNEXPLAINED' for x in ledger) and not exact['dossiers']['removed'],
 'qualityFlips':len(ledger),'qualityFlipCompanies':len({x['id'] for x in ledger}),'adjudications':dict(collections.Counter(x['adjudication'] for x in ledger)),
 'dossiers':exact['dossiers'],'original105':dict(collections.Counter(x['disposition'] for x in disposition)),
 'sameYearSeriesNulls':len(nulls),'sameYearSeriesNullCompanies':len({x['id'] for x in nulls})}
(r/'adjudication-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary))
