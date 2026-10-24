"""Stage a static landing into the existing Worker without relaxing its CSP.

Only generated, manifest-owned assets are managed here. No app environment,
research data, dependencies, source maps or server output enters public/.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'apps/landing/dist'
PUBLIC = ROOT / 'apps/registry/public'
MANIFEST = PUBLIC / 'landing-manifest.json'
BLOCK = '# BEGIN generated landing assets'
END = '# END generated landing assets'


def source_inputs():
    sources = [ROOT / 'apps/landing' / name for name in
               ['package.json', 'package-lock.json', 'astro.config.mjs', 'tsconfig.json']]
    sources += sorted((ROOT / 'apps/landing/src').rglob('*'))
    sources += [Path(__file__).resolve()]
    return {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sources if p.is_file()}


def safe_public_path(path):
    p = Path(path)
    if p.is_absolute() or '..' in p.parts or not p.parts:
        raise ValueError('Unsafe manifest path')
    destination = PUBLIC / p
    if any(parent.is_symlink() for parent in [destination, *destination.parents] if parent != PUBLIC.parent):
        raise ValueError('Symlink in public manifest path')
    return destination


def verify_public():
    manifest = json.loads(MANIFEST.read_text())
    if manifest.get('source_inputs') != source_inputs():
        raise SystemExit('Landing sources changed: run make landing before deployment.')
    allowlist = set((PUBLIC / '.assetsignore').read_text().splitlines())
    for path, digest in manifest['files'].items():
        destination = safe_public_path(path)
        if not destination.is_file() or hashlib.sha256(destination.read_bytes()).hexdigest() != digest:
            raise SystemExit('Landing asset differs from its manifest: ' + path)
        if '/' in path and '!/' + path not in allowlist:
            raise SystemExit('Landing asset omitted from upload allowlist: ' + path)
    print(f'Landing source and public-byte guard passed ({len(manifest["files"])} assets).')


def generate():
    files = {}
    for source in sorted((SOURCE / '_astro').rglob('*')):
        if source.is_file():
            if source.is_symlink() or source.suffix not in {'.js', '.css', '.woff2'}:
                raise ValueError(f'Unexpected landing asset: {source}')
            files[source.relative_to(SOURCE).as_posix()] = source.read_bytes()
    html = (SOURCE / 'index.html').read_text()

    def externalize(match):
        tag, attrs, content = match.groups()
        if tag == 'script' and re.search(r'\bsrc\s*=', attrs):
            return match[0]
        if not content.strip():
            return match[0]
        suffix = '.js' if tag == 'script' else '.css'
        data = content.encode()
        name = '_astro/inline-' + hashlib.sha256(data).hexdigest()[:20] + suffix
        files[name] = data
        if tag == 'script':
            return f'<script{attrs} src="/{name}"></script>'
        return f'<link rel="stylesheet" href="/{name}">'

    html = re.sub(r'<(script|style)\b([^>]*)>(.*?)</\1>', externalize, html, flags=re.S)
    if re.search(r'<style\b|\sstyle\s*=|<script(?![^>]*\bsrc=)[^>]*>\s*\S', html, flags=re.IGNORECASE):
        raise ValueError('Inline styling or script escaped externalization')
    if re.search(r'(?:src|href)=["\']https?://', html, flags=re.IGNORECASE):
        # Canonical/OG URLs are metadata; content dependencies must remain local.
        links = re.findall(r'<(?:script|link)[^>]+(?:src|href)=["\'](https?://[^"\']+)', html, flags=re.IGNORECASE)
        if any(link != 'https://research.mazzeleczzare.com/' for link in links):
            raise ValueError('Unexpected remote dependency')
    files['index.html'] = html.encode()

    packages = ROOT / 'apps/landing/node_modules/@fontsource-variable'
    fonts = []
    for family, filename, public_name in [
        ('bodoni-moda', 'bodoni-moda-latin-wght-normal.woff2', 'BodoniModa-Latin.woff2'),
        ('manrope', 'manrope-latin-wght-normal.woff2', 'Manrope-Latin.woff2'),
    ]:
        folder = packages / family
        metadata = json.loads((folder / 'metadata.json').read_text())
        package = json.loads((folder / 'package.json').read_text())
        if metadata['license']['type'] != 'OFL-1.1':
            raise ValueError('Recheck font license before staging')
        data = (folder / 'files' / filename).read_bytes()
        files['fonts/' + public_name] = data
        files['fonts/' + public_name.replace('.woff2', '-OFL.txt')] = (folder / 'LICENSE').read_bytes()
        fonts.append({'family': metadata['family'], 'package': package['name'],
                      'version': package['version'], 'file': public_name,
                      'sha256': hashlib.sha256(data).hexdigest(), 'license': metadata['license'],
                      'scope': 'unmodified Latin webfont; open approximation, not the referenced commercial family'})
    files['fonts/landing-provenance.json'] = (json.dumps(fonts, indent=2) + '\n').encode()
    return files


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--verify-public', action='store_true')
    args = parser.parse_args()
    if args.verify_public:
        verify_public()
        return
    files = generate()
    previous = json.loads(MANIFEST.read_text())['files'] if MANIFEST.exists() else {}
    manifest = {'generator': 'Astro static landing + stage_landing.py', 'source_inputs': source_inputs(), 'files': {
        path: hashlib.sha256(data).hexdigest() for path, data in sorted(files.items())}}
    files['landing-manifest.json'] = (json.dumps(manifest, indent=2) + '\n').encode()
    ignore_path = PUBLIC / '.assetsignore'
    ignore = ignore_path.read_text()
    prior_block = re.compile(re.escape(BLOCK) + r'.*?' + re.escape(END) + r'\n?', re.S)
    ignore = prior_block.sub('', ignore).rstrip() + '\n\n'
    directories = {'/' + str(Path(p).parent).replace('\\', '/') + '/' for p in files if '/' in p}
    ignore += BLOCK + '\n' + '\n'.join('!' + p for p in sorted(directories)) + '\n'
    ignore += '\n'.join('!/' + p for p in sorted(files) if '/' in p) + '\n' + END + '\n'
    files['.assetsignore'] = ignore.encode()
    stale = set(previous) - set(manifest['files'])
    if args.check:
        bad = [p for p, data in files.items() if not (PUBLIC / p).is_file() or (PUBLIC / p).read_bytes() != data]
        bad += [p for p in stale if (PUBLIC / p).exists()]
        if bad:
            raise SystemExit('Stale landing assets: ' + ', '.join(bad))
        print(f'Landing manifest and strict-CSP staging match ({len(manifest["files"])} assets).')
        return
    for path in stale:
        destination = safe_public_path(path)
        if destination.is_file():
            if hashlib.sha256(destination.read_bytes()).hexdigest() != previous[path]:
                raise ValueError(f'Refusing to remove edited generated asset: {path}')
            destination.unlink()
    for path, data in files.items():
        destination = safe_public_path(path)
        if destination.is_file() and destination.read_bytes() == data:
            continue
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
    print(f'Staged {len(manifest["files"])} local landing assets; no CSP exceptions needed.')


if __name__ == '__main__':
    main()
