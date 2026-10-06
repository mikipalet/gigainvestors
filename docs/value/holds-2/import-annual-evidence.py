"""Bind reviewed original annual tables to the general cached correction path.
No remote calls; source files and values are reviewed evidence, not ticker code.
"""
import hashlib,json,os
from pathlib import Path
root=Path.home()/'data/value-holds'
corpus=Path(os.environ.get('VALUE_CORPUS_DIR',root/'corpus')).resolve()
assert corpus.is_relative_to(root.resolve())
for volume in [Path('/'),root]:
 s=os.statvfs(volume)
 assert s.f_bavail*s.f_frsize>=4*1024**3,'DISK STOP: commit'
bases=json.loads(Path('docs/value/holds-1/source-bases.json').read_text())
def fact(val,start='2025-01-01',end='2025-12-31'):
 return dict(start=start,end=end,val=val,form='annual-report',filed='',accn='reviewed-original-annual-table')
records={}
for id,base in bases.items():
 proofs=base['reviewedFields']; p=proofs['dilutedShares'];body=(root/'downloads'/p['file']).read_bytes()
 assert hashlib.sha256(body).hexdigest()==p['sha256']
 for proof in proofs.values():
  assert all(' '.join(a.split()) in ' '.join(body.decode().split()) for a in proof['anchors'])
 val=p['value']
 options={}
 if id=='BAYRY.US':
  val/=4;options=dict(ordinaryPerAds=.25,shareBasisDate='2025-12-31',shareBasisSource='https://www.bayer.com/en/investors/shareholder-information/adr-program')
 if id=='KNCRF.US':
  val/=3;options=dict(shareBasisDate='2025-12-31',shareBasisSource='https://investors.konecranes.com/share-split')
 tags={'WeightedAverageNumberOfDilutedSharesOutstanding':{'units':{'shares':[fact(val)]}}}
 if id=='FBAK.US':
  tags.update(InterestIncomeExpenseNet={'units':{'USD':[fact(188791000)]}},NoninterestIncome={'units':{'USD':[fact(29072000)]}})
 records[id]=dict(source=p['source'],**options,facts={'facts':{'us-gaap':tags}},evidence=dict(textSha256=p['sha256'],pdfSha256=hashlib.sha256((root/'downloads'/p['file'].replace('.txt','.pdf')).read_bytes()).hexdigest(),proofs=proofs,annotation='Original issuer PDF manually transcribed into canonical concept names; not SEC XBRL. Annual weighted diluted count, not quarterly or outstanding.'))
 # Preserve comparative annual observations from the same original tables.
 comparative={'BAYRY.US':982420000,'KNCRF.US':79488000,'PEYUF.US':197084973,'ZLDSF.US':261700000}
 if id in comparative:
  tags['WeightedAverageNumberOfDilutedSharesOutstanding']['units']['shares'].append(fact(comparative[id],'2024-01-01','2024-12-31'))
 target=corpus/'raw/annual-reviewed'/f'{id}.json';target.parent.mkdir(parents=True,exist_ok=True)
 target.write_text(json.dumps(records[id],indent=2)+'\n')
Path('docs/value/holds-2/annual-evidence.json').write_text(json.dumps(records,indent=2)+'\n')
print(json.dumps({'imported':list(records),'hashBound':True}))
