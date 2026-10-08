"""Controller-only: validate and install an approved overlay into a fresh
staging corpus under ~/data. Does not copy/read/acquire any runner lock."""
import json,hashlib,tarfile,sys,os,subprocess,datetime
from pathlib import Path
bundle=Path(sys.argv[1]).resolve();stage=Path(sys.argv[2]).resolve();data=(Path.home()/'data').resolve()
assert stage.is_relative_to(data)and stage!=(Path.home()/'value-corpus').resolve(),'Use a staging corpus under ~/data'
m=json.loads((bundle/'manifest.json').read_text());assert m['status']=='READY','Bundle is NOT approved'
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
for name,want in m['artifacts'].items():assert digest(bundle/name)==want, 'Bundle artifact changed: '+name
now=datetime.datetime.now(datetime.timezone.utc).time().replace(tzinfo=None)
assert not(datetime.time(3)<=now<datetime.time(9,40)), 'Wait outside the nightly window, then recheck/rebind'
assert not Path('scripts/value/approved-verdict-changes.json').exists(),'Buy approval manifest must not exist'
base=json.loads((bundle/'archive-baseline.json').read_text())
assert subprocess.check_output(['git','-C',str(stage/'publish-repo'),'rev-parse','HEAD'],text=True).strip()==base['commit'], 'Live archive advanced; rebase the candidate'
for rel,want in base['files'].items():assert digest(stage/'publish-repo'/rel)==want,'Archive baseline changed: '+rel
assert not(stage/'publish.hold').exists(),'Keep the live hold; omit it from the separate release staging corpus'
with tarfile.open(bundle/'corpus-overlay.tar.gz')as archive:
 for member in archive:
  rel=member.name;assert rel in m['overlayFiles']and member.isfile()and not Path(rel).is_absolute()and '..'not in Path(rel).parts
  target=stage/rel;assert target.resolve().is_relative_to(stage)
  payload=archive.extractfile(member).read();assert hashlib.sha256(payload).hexdigest()==m['overlayFiles'][rel]
  target.parent.mkdir(parents=True,exist_ok=True)
  if target.is_symlink():target.unlink()
  target.write_bytes(payload)
for rel in m['removedFiles']:
 p=stage/rel;assert p.resolve().is_relative_to(stage)
 if p.is_file() or p.is_symlink():p.unlink()
 elif p.is_dir():raise AssertionError('Removed path is a directory: '+rel)
for rel,want in json.loads((bundle/'analyzed-source-hashes.json').read_text()).items():assert digest(stage/rel)==want,'Analysis inputs changed; repeat the proof: '+rel
now=datetime.datetime.now(datetime.timezone.utc).time().replace(tzinfo=None)
assert not(datetime.time(3)<=now<datetime.time(9,40)), 'Rebind after nightly window'
print('Approved bundle installed and source bindings verified in staging')
