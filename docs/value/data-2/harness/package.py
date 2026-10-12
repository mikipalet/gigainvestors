"""data-2: write the release bundle manifest for the controller (code-only release).
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
    'status': status, 'method': '3.8.2', 'codeCommit': commit, 'baseCommit': '6f52793', 'boundLiveArchive': '63fad7cba1a858e205019664d7d6e500156a31e3',
    'corpusOverlay': None, 'approvalManifest': None, 'verdictFreeze': 'unchanged (41 reviewed data-error ids; JBS.US stays frozen, owner decision)', 'releaseSteps': 'renormalize-edinet (published EDINET ids) + analyze (published ids), offline, then publish',
    'forwardTest': {'path': str(snapshot.relative_to(repo)), 'sha256': sha(snapshot), 'companies': len(snap['companies']),
                    'western': sum(1 for c in snap['companies'] if c['western']), 'publishCommitAtFreeze': snap['archive']['publishCommit'],
                    'note': 'Frozen 3.8.0 list, unchanged; the controller verifies the publication equals it less the names corrections.jsonl removes (NFLX.US, TGS.US).'},
    'corrections': {'path': 'docs/value/forward-test/corrections.jsonl', 'sha256': sha(repo / 'docs/value/forward-test/corrections.jsonl'), 'lines': len((repo / 'docs/value/forward-test/corrections.jsonl').read_text().splitlines())},
    'evidence': files,
}
(bundle / 'manifest.json').write_text(json.dumps(manifest, indent=1) + '\n')
print(json.dumps({k: manifest[k] for k in ['status', 'method', 'codeCommit']}))
