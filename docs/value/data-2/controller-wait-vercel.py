"""Controller-only read-only wait: production Vercel deployment of exactly this release SHA is Ready.
Accepts either GitHub's Vercel commit status (as logofix-2) or, when that status never posts
(as on 2026-10-12 18:22 UTC), a production deployment that the Vercel CLI lists for the SHA
(`vercel ls --prod -m githubCommitSha=<sha>`) and `vercel inspect` reports Ready.
Usage: python3 controller-wait-vercel.py <40-hex sha>"""
import json, re, subprocess, sys, time
sha = sys.argv[1]
assert len(sha) == 40 and all(c in '0123456789abcdef' for c in sha)
SCOPE, PROJECT = 'mikipalets-projects', 'superinvestors'
PREFIX = f'https://vercel.com/{SCOPE}/{PROJECT}/'

def inspect(target):
    result = json.loads(subprocess.check_output(['vercel', 'inspect', target, '--scope', SCOPE, '--json', '--wait', '--timeout=15m']))
    meta = result.get('meta') or {}
    assert result['readyState'] == 'READY' and result['target'] == 'production', 'Production deployment is not Ready'
    assert meta.get('githubCommitSha', sha) == sha, 'Deployment belongs to another commit'
    return result

def from_status():
    data = json.loads(subprocess.check_output(['gh', 'api', f'repos/mikipalet/gigainvestors/commits/{sha}/status']))
    status = next((s for s in data['statuses'] if s['context'] == 'Vercel'), None)
    if status and status['state'] in ['failure', 'error']: raise SystemExit('Vercel rejected this release; runner remains paused')
    if not status or status['state'] != 'success': return None
    assert status['target_url'].startswith(PREFIX), 'Unexpected deployment project'
    deployment = status['target_url'][len(PREFIX):].strip('/')
    assert deployment.isalnum(), 'Invalid deployment ID'
    if not deployment.startswith('dpl_'): deployment = 'dpl_' + deployment
    result = inspect(deployment)
    assert result['id'] == deployment
    return {'release': sha, 'deployment': deployment, 'readyState': result['readyState'], 'url': result['url'], 'via': 'github-status'}

def from_vercel_list():
    out = subprocess.run(['vercel', 'ls', PROJECT, '--scope', SCOPE, '--prod', '-m', f'githubCommitSha={sha}'], capture_output=True, text=True, timeout=120)
    if out.returncode != 0: return None
    urls = sorted(set(re.findall(rf'https://{PROJECT}-[a-z0-9]+-{SCOPE}\.vercel\.app', out.stdout + out.stderr)))
    # The server filters on the commit SHA; an unfiltered production list would be long.
    if not urls or len(urls) > 3: return None
    for url in urls:
        try: result = inspect(url)
        except (AssertionError, subprocess.CalledProcessError): continue
        return {'release': sha, 'deployment': result['id'], 'readyState': result['readyState'], 'url': result['url'], 'via': 'vercel-ls'}
    return None

for attempt in range(90):
    found = from_status() or (from_vercel_list() if attempt % 3 == 2 else None)
    if found: print(json.dumps(found)); break
    time.sleep(10)
else: raise SystemExit('Timed out waiting for the release deployment; runner remains paused')
