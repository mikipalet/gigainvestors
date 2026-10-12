"""data-2: bind an independent corpus copy and its released archive for the isolated
publication proof. 3.8.2 changes only code: there is no corpus overlay to install.
Usage: python3 setup.py <root>   (root/corpus is an rsync -aL copy of ~/value-corpus without
runner lock, publish hold, secrets, backups or logs)."""
import hashlib, json, os, shutil, subprocess, sys
from pathlib import Path
root = Path(sys.argv[1]); c = root / 'corpus'; e = root / 'evidence'
assert min(shutil.disk_usage(p).free for p in ['/', str(root)]) >= 4 * 1024 ** 3, 'DISK STOP'
for name in ['daily-runner.lock', 'publish.hold', '.env', '.env.local']:
    assert not (c / name).exists(), f'excluded path copied: {name}'
for p in [c, c / 'publish-repo', c / 'fundamentals', c / 'raw' / 'eodhd', c / 'enrichment-v7']:
    assert not p.is_symlink(), f'independent copy required: {p}'
def digest(p):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()
head = subprocess.check_output(['/usr/bin/git', '-C', str(c / 'publish-repo'), 'rev-parse', 'HEAD'], text=True).strip()
base = root / 'baseline'
if base.exists(): shutil.rmtree(base)
archive = {}
for p in (c / 'publish-repo').rglob('*'):
    if '.git' in p.parts or not p.is_file(): continue
    rel = p.relative_to(c / 'publish-repo'); dst = base / rel; dst.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(p, dst); archive[str(rel)] = digest(p)
(e / 'archive-baseline.json').write_text(json.dumps({'commit': head, 'files': archive}, indent=1) + '\n')
remote = root / 'storage' / 'remote.git'
if remote.exists(): shutil.rmtree(remote)
subprocess.run(['/usr/bin/git', 'clone', '--bare', '--no-hardlinks', str(c / 'publish-repo'), str(remote)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for args in (['remote', 'set-url', 'origin', str(remote)], ['remote', 'set-url', '--push', 'origin', str(remote)], ['config', 'core.hooksPath', '/dev/null']):
    subprocess.run(['/usr/bin/git', '-C', str(c / 'publish-repo'), *args], check=True)
(e / 'setup.json').write_text(json.dumps({'sourceHead': head, 'archiveFiles': len(archive), 'secretFilesCopied': False}, indent=1) + '\n')
print('bound', head, len(archive), 'archive files', flush=True)
