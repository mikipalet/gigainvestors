from pathlib import Path
import tarfile,hashlib,json,shutil
repo=Path('/Users/miki/data/value-rules');r=repo/'.audit/rules-6';out=repo/'release-bundle-rules-6';out.mkdir(exist_ok=True);e=r/'evidence'
p=out/'replay-evidence.tar.gz'
with tarfile.open(p,'w:gz',compresslevel=1)as t:
 for source in [r/'engines',r/'research']:
  for f in sorted(source.rglob('*')):
   if f.is_file() and not f.is_relative_to(r/'research/replay'):t.add(f,arcname=str(f.relative_to(repo)),recursive=False)
 inputs={}
 for f in sorted((r/'research/baseline').glob('*.json.gz')):
  external=Path('/Users/miki/data/value-research/inputs/replay')/f.name
  src=external if external.exists() else r/'research/replay'/f.name
  inputs[f.name]=hashlib.sha256(src.read_bytes()).hexdigest()
  t.add(src,arcname=str((r/'research/replay'/f.name).relative_to(repo)),recursive=False)
 (e/'replay-input-hashes.json').write_text(json.dumps(inputs,indent=2)+'\n')
with tarfile.open(p)as t:n=sum(1 for _ in t)
h=hashlib.sha256(p.read_bytes()).hexdigest()
(e/'replay-archive-integrity.json').write_text(json.dumps({'sha256':h,'files':n,'bytes':p.stat().st_size,'extractAt':'repository root','replayInputs':len(inputs),'reproduction':'All selected replay inputs included; set REPLAY_INPUT_ROOT to the extracted research directory, which contains inputs/replay only if copied there; otherwise use the included replay fallback with REPLAY_INPUT_ROOT=/nonexistent','engines':'Frozen sources included, no rules-5 regeneration required'},indent=2)+'\n')
for name in ['decision-metrics.json','portfolios.json','evaluation-opened.json']:
 shutil.copy2(r/'research'/name,e/name)
print('Archived replay:',n,'files;',p.stat().st_size,'bytes')
