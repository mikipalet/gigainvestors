import pathlib,json,hashlib,sys
root=pathlib.Path(__file__).resolve().parents[3];logos=root/'corpus/enrichment-v7/logos';proof=json.loads((root/'lib/value/logo-restorations.json').read_text());file=root/'evidence-2/approved-before-stage.json'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
if sys.argv[1]=='before':
 records={}
 for p in logos.glob('*.json'):
  if p.name.startswith('_'):continue
  r=json.loads(p.read_text())
  if r.get('logo') and r.get('validated') and r.get('identityReview') in [None,'approved','passed']:records[p.name]=sha(p)
 file.write_text(json.dumps(records,indent=2)+'\n');print('Protected records',len(records))
else:
 records=json.loads(file.read_text());changed=[i for i,h in records.items() if sha(logos/i)!=h];bad=[]
 for i,r in proof['entries'].items():
  p=logos/(i+'.json');actual=json.loads(p.read_text()) if p.exists() else None
  if actual!=r['cache']:bad.append(i)
 result={'nonnullRecords':len(records),'changed':changed,'historicalStates':len(proof['entries']),'changedHistorical':bad};(root/'evidence-2/preservation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));assert not changed and not bad
