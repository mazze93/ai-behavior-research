"""Read-only release verification. Default curl; never replay cookies or alter access.

Run from the repository root with --version, --source and a new --output path.
Source-byte checks use the Worker origin; canonical HTML has separately recorded
transport insertions. No response body or challenge parameter is persisted.
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


ROOT = Path.cwd()
REGISTRY = ROOT / 'apps/registry'
PUBLIC = REGISTRY / 'public'
WORKER = 'https://identity-research-web.mazzewhiteley93.workers.dev'
CANONICAL = 'https://research.mazzeleczzare.com'


def cli(args):
    result = subprocess.run(
        ['mise', 'exec', '--', 'npx', '--no-install', 'wrangler', *args,
         '--config', 'wrangler.jsonc', '--json'], cwd=REGISTRY,
        capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def fetch(url):
    with tempfile.TemporaryDirectory(prefix='ethics-http-') as task_dir:
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


def safe_bindings(bindings):
    output = []
    for binding in bindings:
        safe = {key: binding[key] for key in [
            'name', 'type', 'bucket_name', 'database_id', 'database_name',
            'queue_name', 'namespace_id', 'script_name'] if key in binding}
        if binding.get('type') == 'plain_text':
            safe['text'] = binding.get('text')
        output.append(safe)
    return output


def verify_asset(name):
    result, data = fetch(WORKER + '/' + name)
    assert result['status'] == 200, (name, result['status'])
    assert result['sha256'] == hashlib.sha256((PUBLIC / name).read_bytes()).hexdigest(), name
    expected = {'.html': {'text/html'}, '.css': {'text/css'},
                '.js': {'text/javascript', 'application/javascript'},
                '.json': {'application/json'}, '.xml': {'application/xml', 'text/xml'},
                '.txt': {'text/plain'}, '.woff2': {'font/woff2', 'application/font-woff2'},
                '.svg': {'image/svg+xml'}}
    suffix = Path(name).suffix
    assert result['content_type'].split(';')[0] in expected[suffix], name
    assert result['csp'] and "frame-ancestors 'none'" in result['csp'], name
    if suffix in {'.html', '.json', '.xml', '.txt'}:
        assert result['cache_control'] == 'no-store', name
    result['matches_source'] = True
    return name, result


def canonical_html(name):
    result, data = fetch(CANONICAL + '/' + name)
    assert result['status'] == 200, (name, result['status'])
    text = data.decode()
    bridge = (r'<script type="module" async fetchpriority="low" '
              r'src="https://research\.mazzeleczzare\.com/\.webmcp/bridge\.js" '
              r'data-packs="c2pa,mcp-server-client"></script>')
    text, bridge_count = re.subn(bridge, '', text)
    text, challenge_count = re.subn(r'<script>window\.__CF\$cv\$params=.*?</script>', '', text, flags=re.S)
    assert bridge_count <= 1 and challenge_count <= 1
    # Normalization is for comparison only. The actual response/browser is not changed.
    digest = hashlib.sha256(text.encode()).hexdigest()
    assert digest == hashlib.sha256((PUBLIC / name).read_bytes()).hexdigest(), name
    return name, {**result, 'raw_bytes_match_source': data == (PUBLIC / name).read_bytes(),
                  'comparison_only_insertions_removed': {'browser_bridge': bridge_count,
                                                        'edge_challenge': challenge_count},
                  'authored_bytes_match_after_recorded_comparison': True,
                  'comparison_sha256': digest}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--version', required=True)
    parser.add_argument('--source', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    subprocess.run(['git', 'diff', '--exit-code', args.source, '--', 'apps', 'scripts'], check=True)
    before = json.loads((ROOT / 'docs/research-hub/ethics-preflight-2026-10-16.json').read_text())
    deployment = cli(['deployments', 'list'])[-1]
    assert deployment['versions'] == [{'version_id': args.version, 'percentage': 100}]
    version = cli(['versions', 'view', args.version])
    resources = version['resources']
    bindings = safe_bindings(resources['bindings'])
    assert bindings == before['bindings']
    assert resources['script_runtime'] == before['script_runtime']
    assert args.source in deployment['annotations']['workers/message']
    old = json.loads((ROOT / 'docs/research-hub/deployment-landing-2026-10-16.json').read_text())
    paths = set(old['http_readback']['assets']) | {
        'ethics.html', 'method-audit.html', 'method-audit-2026-10-16.json',
        'research-notes.css', 'method.html', 'persona-about.html', 'identity.html',
        'llms.txt', 'sitemap.xml', 'style.css'}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        assets = dict(pool.map(verify_asset, sorted(paths)))
    canonical = dict(canonical_html(name) for name in [
        'ethics.html', 'method-audit.html', 'method.html', 'persona-about.html',
        'identity.html', 'index.html'])
    health = {}
    for host in [WORKER, CANONICAL]:
        result, data = fetch(host + '/api/health')
        assert result['status'] == 200 and json.loads(data)['version'] == args.version
        health[host] = {**result, 'version': args.version}
    release_result, data = fetch(CANONICAL + '/api/releases')
    release_hashes = {row['id']: row['sha256'] for row in json.loads(data)}
    expected = old['http_readback']['releases']['release_ids_and_bundle_sha256']
    assert release_hashes == expected
    bundles = {}
    for release_id, digest in expected.items():
        result, data = fetch(CANONICAL + '/api/releases/' + release_id)
        assert result['status'] == 200 and result['sha256'] == digest
        bundles[release_id] = result
    routes = {}
    for path, status in [('/persona.html', 303), ('/%70ersona.html', 303), ('/api/studies', 401)]:
        result, _ = fetch(CANONICAL + path)
        assert result['status'] == status, (path, result['status'])
        routes[path] = result
    report = {'verified_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'source_commit': args.source, 'worker': 'identity-research-web',
              'verified_byte_origin': WORKER, 'canonical_origin': CANONICAL,
              'version': args.version, 'deployment_id': deployment['id'],
              'traffic': deployment['versions'], 'annotations': deployment['annotations'],
              'rollback_version': before['deployment']['versions'][0]['version_id'],
              'bindings_match_preflight': True, 'bindings': bindings,
              'runtime_match_preflight': True, 'runtime': resources['script_runtime'],
              'assets': assets, 'assets_verified': len(assets), 'canonical_html': canonical,
              'health': health, 'releases': {'index_status': release_result['status'],
              'ids_and_bundle_sha256': release_hashes, 'bundles': bundles},
              'unauthenticated_routes': routes,
              'client': 'Default curl; no cookies, credentials, spoofed headers or access-policy changes.',
              'verification_adjustment': 'Initial canonical HTML hash check found browser-bridge and edge-challenge insertions. Exact asset bytes verified at Worker origin. Canonical authored HTML compared only after removing the two explicitly recorded insertions; raw response hashes remain separate.',
              'scope': 'Public ethics/provenance and selected audit output; no new model calls, evidence release, protocol amendment, data migration or raw transcript upload.',
              'browser': 'pending production readback'}
    with args.output.open('x') as output:
        json.dump(report, output, indent=2)
        output.write('\n')
    print(json.dumps({'version': args.version, 'assets_verified': len(assets),
                      'canonical_pages_compared': len(canonical),
                      'public_release_bundles_unchanged': len(bundles),
                      'bindings_unchanged': True, 'output': str(args.output)}, indent=2))


if __name__ == '__main__':
    main()
