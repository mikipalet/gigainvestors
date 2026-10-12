"""fairbuy-1: write the release bundle manifest for the controller (code-only release).
Usage: python3 package.py <repo> <bundle dir> <evidence dir> <status>"""
import hashlib, json, subprocess, sys
from pathlib import Path
repo, bundle, evidence, status = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4]
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
commit = subprocess.check_output(['git', '-C', str(repo), 'rev-parse', 'HEAD'], text=True).strip()
assert not subprocess.check_output(['git', '-C', str(repo), 'status', '--porcelain', '--untracked-files=no'], text=True).strip(), 'tracked changes must be committed'
snapshot = repo / 'docs/value/forward-test/2026-10-12-buy-list.json'
snap = json.loads(snapshot.read_text())
bundle.mkdir(parents=True, exist_ok=True)
files = {}
for p in sorted(evidence.glob('*.json')):
    files[p.name] = sha(p)
manifest = {
    'status': status, 'method': '3.8.0', 'codeCommit': commit, 'baseCommit': '94ab355',
    'corpusOverlay': None, 'approvalManifest': None, 'verdictFreeze': 'unchanged (41 reviewed data-error ids)',
    'forwardTest': {'path': str(snapshot.relative_to(repo)), 'sha256': sha(snapshot), 'companies': len(snap['companies']),
                    'western': sum(1 for c in snap['companies'] if c['western']), 'publishCommitAtFreeze': snap['archive']['publishCommit'],
                    'note': 'Frozen from the bound post-nightly proof; the controller verifies it equals the real publication.'},
    'evidence': files,
}
(bundle / 'manifest.json').write_text(json.dumps(manifest, indent=1) + '\n')
print(json.dumps({k: manifest[k] for k in ['status', 'method', 'codeCommit']}))
