"""data-2: write the release bundle manifest for the controller (code release plus one corpus file,
the new verdict-freeze.json that lifts the JBS.US hold once its 20-F record is in the analysis).
Usage: python3 package.py <repo> <bundle dir> <evidence dir> <status> <live verdict-freeze.json>"""
import hashlib, json, subprocess, sys
from pathlib import Path
repo, bundle, evidence, status, live_freeze = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4], Path(sys.argv[5])
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
commit = subprocess.check_output(['git', '-C', str(repo), 'rev-parse', 'HEAD'], text=True).strip()
assert not subprocess.check_output(['git', '-C', str(repo), 'status', '--porcelain', '--untracked-files=no'], text=True).strip(), 'tracked changes must be committed'
snapshot = repo / 'docs/value/forward-test/2026-10-12-buy-list.json'
snap = json.loads(snapshot.read_text())
freeze = bundle / 'verdict-freeze.json'
new, old = json.loads(freeze.read_text()), json.loads(live_freeze.read_text())
assert set(old['ids']) - set(new['ids']) == {'JBS.US'} and set(new['ids']) <= set(old['ids']), 'the new freeze must only lift JBS.US'
bundle.mkdir(parents=True, exist_ok=True)
files = {p.name: sha(p) for p in sorted(evidence.glob('*.json'))}
manifest = {
    'status': status, 'method': '3.8.3', 'codeCommit': commit, 'baseCommit': '065d957', 'boundLiveArchive': '578f097405490892dbc8ee1320914cd8514975d2',
    'corpusOverlay': {'verdict-freeze.json': 'lifts JBS.US only; install after the JBS.US analysis is its 20-F record (controller-commands.md)'},
    'corpusOverlayFiles': {'verdict-freeze.json': sha(freeze)},
    'approvalManifest': None,
    'verdictFreeze': {'liveSha256': sha(live_freeze), 'newSha256': sha(freeze), 'liveIds': len(old['ids']), 'newIds': len(new['ids']), 'lifted': ['JBS.US'],
                      'reason': 'JBS.US: its corrected record (20-F, USD, FY2023-FY2025, a findable three-year dossier) no longer removes it; evidence docs/value/data-2/evidence/jbs-record.json'},
    'releaseSteps': 'renormalize-edinet (published EDINET ids) + analyze (published ids), offline, then the JBS check, the freeze install, publish',
    'forwardTest': {'path': str(snapshot.relative_to(repo)), 'sha256': sha(snapshot), 'companies': len(snap['companies']),
                    'western': sum(1 for c in snap['companies'] if c['western']), 'publishCommitAtFreeze': snap['archive']['publishCommit'],
                    'note': 'Frozen 3.8.0 list, unchanged; the controller verifies the publication equals it less the names corrections.jsonl removes (NFLX.US, TGS.US).'},
    'corrections': {'path': 'docs/value/forward-test/corrections.jsonl', 'sha256': sha(repo / 'docs/value/forward-test/corrections.jsonl'), 'lines': len((repo / 'docs/value/forward-test/corrections.jsonl').read_text().splitlines())},
    'evidence': files,
}
(bundle / 'manifest.json').write_text(json.dumps(manifest, indent=1) + '\n')
print(json.dumps({k: manifest[k] for k in ['status', 'method', 'codeCommit']}))
