"""Rebuild the evidence-bound recovery bundle from read-only local primary evidence."""
import hashlib,json,pathlib,shutil,subprocess
root=pathlib.Path(__file__).resolve().parents[3];live=pathlib.Path.home()/'value-corpus';bundle=root/'bundle-2';e=root/'evidence-2'
def sha(b):return hashlib.sha256(b).hexdigest()
def put(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,indent=2)+'\n')
proof=json.loads((root/'lib/value/logo-restorations.json').read_text());snapshot=live/'enrichment-v7/logos/runs'/proof['snapshot'];before={r['id']:r for r in json.loads(snapshot.read_text())}
repo=live/'publish-repo'
names=subprocess.check_output(['git','-C',str(repo),'ls-tree','-r','--name-only',proof['archive']],text=True).splitlines()
archive={}
for f in names:
 if len(f)==13 and f.startswith('index/') and f.endswith('.json'):
  archive.update({r['id']:r for r in json.loads(subprocess.check_output(['git','-C',str(repo),'show',proof['archive']+':'+f]))})
assert archive==json.loads((e/'archive-index.json').read_text())
entries=[]
for i,r in proof['entries'].items():
 assert before[i]['cache']==r['cache'],i
 if r.get('surface')=='dossier':
  h=2166136261
  for byte in i.encode():h=((h^byte)*16777619)&0xffffffff
  dossier=json.loads(subprocess.check_output(['git','-C',str(repo),'show',proof['archive']+f':dossiers/{h%600:03d}.json']))[i]
  assert before[i]['cache']['logo']==r['logo']==dossier['company']['logo'],i
 else:assert before[i]['logo']==r['logo']==archive[i]['lg'],i
 put(bundle/f'records/{i}.json',r['cache'])
 entries.append({'id':i,'beforeHash':sha((live/f'enrichment-v7/logos/{i}.json').read_bytes()),'recordHash':sha((bundle/f'records/{i}.json').read_bytes())})
add=bundle/'additions';add.mkdir(parents=True,exist_ok=True)
if not (add/'manifest.json').exists():put(add/'manifest.json',{'version':1,'entries':[]})
files={str(p.relative_to(bundle)):sha(p.read_bytes()) for p in sorted(bundle.rglob('*')) if p.is_file() and p.name!='manifest.json'}
files['additions/manifest.json']=sha((add/'manifest.json').read_bytes())
manifest={'version':1,'archive':proof['archive'],'snapshot':proof['snapshot'],'snapshotHash':sha(snapshot.read_bytes()),'archiveIndexHash':sha((e/'archive-index.json').read_bytes()),'entries':entries,'files':files}
put(bundle/'manifest.json',manifest);shutil.copyfile(bundle/'manifest.json',root/'docs/value/logofix-2/bundle-manifest.json')
print(json.dumps({'restorations':len(entries),'additions':len(json.loads((add/'manifest.json').read_text())['entries']),'manifestHash':sha((bundle/'manifest.json').read_bytes())}))
