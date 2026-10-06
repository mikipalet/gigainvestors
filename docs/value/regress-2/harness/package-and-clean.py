"""Package verified artifacts and delete this task's corpus/build copies."""
import hashlib,json,shutil,tarfile
from pathlib import Path
r=Path('/Users/miki/data/regress/run2');e=r/'evidence';b=Path('/Users/miki/data/regress/release-bundle');d=Path('docs/value/regress-2')
read=lambda p:json.loads(p.read_text())
assert read(e/'verification.json')['passed']and read(e/'overlay-integrity.json')['passed']
assert (d/'report.md').read_text().splitlines()[0]=='READY'
for p in(d/'harness').rglob('__pycache__'):shutil.rmtree(p)
for name in ['verification.json','release-audit.json','browser-comparison.json','remaining-nulls-primary-evidence.json','suppressed-valuations.json','candidate-archive-integrity.json','overlay-integrity.json','secret-scan.json','live-check.json']:
 shutil.copy2(e/name,d/name)
for name in ['unit-final-isolated','build-candidate','publish-out-final','publish-real','post-check']:
 for ext in ['log','exit']:shutil.copy2(e/(name+'.'+ext),d/(name+'.'+ext))
for name in ['preserved-buy-transitions','retained-published-numbers','issuer-share-contradictions']:
 shutil.copy2(r/('corpus/staging/'+name+'.json'),e/(name+'.json'))
for name in ['prepare.sh','check-issuer.py']:
 if(r/name).exists():shutil.copy2(r/name,e/name)
removed=[]
for p in r.iterdir():
 if p.name=='evidence':continue
 if p.is_dir()and not p.is_symlink():shutil.rmtree(p)
 else:p.unlink()
 removed.append(str(p))
for p in [Path('node_modules'),Path('.next'),Path('/Users/miki/data/regress/tmp')]:
 if p.exists():shutil.rmtree(p);removed.append(str(p.absolute()))
free={p:shutil.disk_usage(p).free for p in ['/','/Users/miki/data']};assert min(free.values())>=4*1024**3
cleanup={'complete':True,'removed':removed,'retained':'source worktree, review evidence and release bundle only','freeBytes':free}
(e/'cleanup.json').write_text(json.dumps(cleanup,indent=2)+'\n');shutil.copy2(e/'cleanup.json',d/'cleanup.json')
(e/'done').touch()
shutil.copy2(d/'report.md',b/'report.md');shutil.copy2(d/'controller-commands.md',b/'controller-commands.md');shutil.copy2(d/'review-evidence.md',b/'residual-approval-list.md')
with tarfile.open(b/'evidence.tar.gz','w:gz')as archive:
 archive.add(e,arcname='evidence');archive.add(d,arcname='docs/value/regress-2')
m=read(b/'manifest.json');m.update(status='NOT',reason='All gates passed; final code commit binding pending.',cleanupComplete=True)
m['artifacts']={name:hashlib.sha256((b/name).read_bytes()).hexdigest()for name in m['artifacts']}
(b/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
print(json.dumps(cleanup,indent=2))
