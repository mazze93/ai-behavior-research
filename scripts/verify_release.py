"""Read-only release verification for the registry Worker. Default curl; never replays cookies.

Run from the repository root.

  inventory   List what this checkout would verify (offline).
  preflight   Before `wrangler deploy`: record the live deployment, bindings,
              runtime and public release hashes to a new JSON file.
  verify      After deploy: confirm 100% traffic on --version, bindings and runtime
              unchanged from the preflight, every deployable public asset
              byte-identical at the Worker origin, canonical HTML identical after
              the two recorded edge insertions, gated routes still gated, health
              reporting the version and public evidence releases unchanged.

The asset set comes from apps/registry/public/.assetsignore (see
release_inventory.py), so it follows the build instead of a copied list. Build
the explorer gallery first: it is Git-ignored and is part of the upload. Output
files are opened with mode 'x' and never overwritten. No response body or
challenge parameter is persisted.
"""
from pathlib import Path
import argparse
import concurrent.futures
import datetime
import hashlib
import json
import re
import subprocess
import tempfile

import release_inventory


ROOT = Path.cwd()
REGISTRY = ROOT / 'apps/registry'
PUBLIC = REGISTRY / 'public'
WORKER = 'https://identity-research-web.mazzewhiteley93.workers.dev'
CANONICAL = 'https://research.mazzeleczzare.com'
UNAUTHENTICATED_ROUTES = [('/persona.html', 303), ('/%70ersona.html', 303), ('/api/studies', 401)]
CLIENT = 'Default curl; no cookies, credentials, spoofed headers or access-policy changes.'


# ---- Transport ----------------------------------------------------------------

def cli(args):
    """Run Wrangler (read-only subcommands only) and parse its JSON output."""
    result = subprocess.run(
        ['mise', 'exec', '--', 'npx', '--no-install', 'wrangler', *args,
         '--config', 'wrangler.jsonc', '--json'], cwd=REGISTRY,
        capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def fetch(url):
    """GET without following redirects; return header summary and body bytes."""
    with tempfile.TemporaryDirectory(prefix='release-http-') as task_dir:
        headers = Path(task_dir) / 'headers'
        body = Path(task_dir) / 'body'
        result = subprocess.run(
            ['curl', '--silent', '--show-error', '--max-time', '30',
             '--dump-header', str(headers), '--output', str(body),
             '--write-out', '%{http_code}', url], capture_output=True,
            text=True, check=True)
        fields = {}
        for line in headers.read_text().splitlines():
            if ':' in line:
                key, value = line.split(':', 1)
                fields[key.lower()] = value.strip()
        data = body.read_bytes()
        return {'status': int(result.stdout), 'bytes': len(data),
                'sha256': hashlib.sha256(data).hexdigest(),
                'content_type': fields.get('content-type'),
                'cache_control': fields.get('cache-control'),
                'csp': fields.get('content-security-policy'),
                'location': fields.get('location')}, data


def write_new(path, report):
    """Write JSON to a path that must not exist yet."""
    with Path(path).open('x') as output:
        json.dump(report, output, indent=2)
        output.write('\n')


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


# ---- Live state ---------------------------------------------------------------

def safe_bindings(bindings):
    """Binding names, types and resource IDs; secret values are never present."""
    output = []
    for binding in bindings:
        safe = {key: binding[key] for key in [
            'name', 'type', 'bucket_name', 'database_id', 'database_name',
            'queue_name', 'namespace_id', 'script_name'] if key in binding}
        if binding.get('type') == 'plain_text':
            safe['text'] = binding.get('text')
        output.append(safe)
    return output


def live_deployment():
    deployment = cli(['deployments', 'list'])[-1]
    assert len(deployment['versions']) == 1, 'Split traffic: verify one version at a time'
    version_id = deployment['versions'][0]['version_id']
    resources = cli(['versions', 'view', version_id])['resources']
    return deployment, version_id, safe_bindings(resources['bindings']), resources['script_runtime']


def public_releases():
    result, data = fetch(CANONICAL + '/api/releases')
    assert result['status'] == 200, result['status']
    return {row['id']: row['sha256'] for row in json.loads(data)}


# ---- Checks -------------------------------------------------------------------

def verify_asset(name):
    """Worker-origin bytes, media type, cache policy and CSP for one public asset."""
    result, _ = fetch(WORKER + '/' + name)
    assert result['status'] == 200, (name, result['status'])
    assert result['sha256'] == hashlib.sha256((PUBLIC / name).read_bytes()).hexdigest(), name
    allowed = release_inventory.expected_content_types(name)
    if allowed is not None:
        assert (result['content_type'] or '').split(';')[0] in allowed, (name, result['content_type'])
    assert result['cache_control'] == release_inventory.expected_cache_control(name), (name, result['cache_control'])
    assert result['csp'] and "frame-ancestors 'none'" in result['csp'], name
    return name, {**result, 'matches_source': True}


def canonical_html(name):
    """Canonical-domain HTML equals source after removing the two recorded edge insertions."""
    result, data = fetch(CANONICAL + '/' + name)
    assert result['status'] == 200, (name, result['status'])
    text = data.decode()
    bridge = (r'<script type="module" async fetchpriority="low" '
              r'src="https://research\.mazzeleczzare\.com/\.webmcp/bridge\.js" '
              r'data-packs="c2pa,mcp-server-client"></script>')
    text, bridge_count = re.subn(bridge, '', text)
    text, challenge_count = re.subn(r'<script>window\.__CF\$cv\$params=.*?</script>', '', text, flags=re.S)
    assert bridge_count <= 1 and challenge_count <= 1, name
    # Normalization is for comparison only. The actual response is not changed.
    digest = hashlib.sha256(text.encode()).hexdigest()
    assert digest == hashlib.sha256((PUBLIC / name).read_bytes()).hexdigest(), name
    return name, {**result, 'raw_bytes_match_source': data == (PUBLIC / name).read_bytes(),
                  'comparison_only_insertions_removed': {'browser_bridge': bridge_count,
                                                        'edge_challenge': challenge_count},
                  'comparison_sha256': digest}


def verify_routes(gated):
    """Anonymous requests to private surfaces stay redirected or refused."""
    routes = {}
    expected = UNAUTHENTICATED_ROUTES + [('/' + name, status) for name, status in gated.items()]
    for path, status in dict(expected).items():
        result, _ = fetch(CANONICAL + path)
        assert result['status'] == status, (path, result['status'])
        routes[path] = result
    return routes


# ---- Commands -----------------------------------------------------------------

def command_inventory(_args):
    public, gated = release_inventory.inventory(PUBLIC)
    gallery = [name for name in public if name.startswith('explorers/')]
    print(json.dumps({'public_assets': public, 'gated_routes': gated,
                      'canonical_html': [n for n in public if n.endswith('.html')],
                      'explorer_gallery_present': bool(gallery)}, indent=2))


def command_preflight(args):
    deployment, version_id, bindings, runtime = live_deployment()
    write_new(args.output, {
        'checked_at': now(), 'worker': 'identity-research-web',
        'deployment': {key: deployment[key] for key in ['id', 'created_on', 'versions', 'annotations']},
        'version_id': version_id, 'bindings': bindings, 'script_runtime': runtime,
        'public_releases': public_releases(), 'client': CLIENT})
    print(json.dumps({'rollback_version': version_id, 'output': str(args.output)}, indent=2))


def command_verify(args):
    subprocess.run(['git', 'diff', '--exit-code', args.source, '--', 'apps', 'scripts'], check=True)
    before = json.loads(Path(args.preflight).read_text())
    public, gated = release_inventory.inventory(PUBLIC)
    assert any(n.startswith('explorers/') for n in public), 'Build the explorer gallery before verifying'

    deployment, version_id, bindings, runtime = live_deployment()
    assert version_id == args.version, ('Live version differs', version_id)
    assert version_id != before['version_id'], 'Preflight was taken after this deploy'
    assert args.source in deployment['annotations'].get('workers/message', ''), 'Deploy message must name the source commit'
    assert bindings == before['bindings'], 'Bindings changed since preflight'
    assert runtime == before['script_runtime'], 'Runtime changed since preflight'

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        assets = dict(pool.map(verify_asset, public))
        canonical = dict(pool.map(canonical_html, [n for n in public if n.endswith('.html')]))
    health = {}
    for host in [WORKER, CANONICAL]:
        result, data = fetch(host + '/api/health')
        assert result['status'] == 200 and json.loads(data)['version'] == args.version, host
        health[host] = {**result, 'version': args.version}
    releases = public_releases()
    assert releases == before['public_releases'], 'Public evidence releases changed during a presentation release'
    routes = verify_routes(gated)

    write_new(args.output, {
        'verified_at': now(), 'source_commit': args.source, 'worker': 'identity-research-web',
        'verified_byte_origin': WORKER, 'canonical_origin': CANONICAL,
        'version': args.version, 'deployment_id': deployment['id'],
        'traffic': deployment['versions'], 'annotations': deployment['annotations'],
        'rollback_version': before['version_id'], 'preflight': str(args.preflight),
        'bindings_match_preflight': True, 'bindings': bindings,
        'runtime_match_preflight': True, 'runtime': runtime,
        'inventory_source': 'apps/registry/public/.assetsignore',
        'assets': assets, 'assets_verified': len(assets), 'canonical_html': canonical,
        'health': health, 'public_releases_unchanged': releases,
        'unauthenticated_routes': routes, 'client': CLIENT, 'scope': args.scope,
        'browser': 'pending production readback'})
    print(json.dumps({'version': args.version, 'assets_verified': len(assets),
                      'canonical_pages_compared': len(canonical),
                      'public_releases_unchanged': len(releases),
                      'gated_routes': len(routes), 'output': str(args.output)}, indent=2))


def main():
    if not __debug__:
        raise SystemExit('Run without -O: every check is an assert.')
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('inventory').set_defaults(run=command_inventory)
    pre = commands.add_parser('preflight')
    pre.add_argument('--output', type=Path, required=True)
    pre.set_defaults(run=command_preflight)
    ver = commands.add_parser('verify')
    ver.add_argument('--version', required=True)
    ver.add_argument('--source', required=True)
    ver.add_argument('--preflight', type=Path, required=True)
    ver.add_argument('--scope', required=True, help='One sentence: what this release changes and does not')
    ver.add_argument('--output', type=Path, required=True)
    ver.set_defaults(run=command_verify)
    args = parser.parse_args()
    args.run(args)


if __name__ == '__main__':
    main()
