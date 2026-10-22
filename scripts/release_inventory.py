"""Pure release-inventory rules for the registry Worker; no network, no subprocess.

The deployable set is derived from apps/registry/public/.assetsignore, which is
what Wrangler reads when it uploads assets, so a new root page, stylesheet or
landing bundle is verified without anyone editing a list. Route and cache rules
mirror apps/registry/src/web.ts and apps/registry/src/response-policy.ts; the
unit tests pin the same sample paths as tests/response-policy.test.ts.
"""
from pathlib import Path, PurePosixPath
import re

# Paths the Worker redirects for anonymous visitors (src/web.ts). They are
# uploaded as assets but must answer 303, never 200, without an owner session.
GATED = {'persona.html': 303}

# Extensions whose served type is fixed; others are recorded, not asserted.
CONTENT_TYPES = {
    '.html': {'text/html'}, '.css': {'text/css'},
    '.js': {'text/javascript', 'application/javascript'},
    '.json': {'application/json'}, '.xml': {'application/xml', 'text/xml'},
    '.txt': {'text/plain'}, '.woff2': {'font/woff2', 'application/font-woff2'},
    '.svg': {'image/svg+xml'},
}

_FONT = re.compile(r'^/fonts/(Basteleur-(Bold|Moonlight)|BodoniModa-Latin|Manrope-Latin)\.woff2$')
_LANDING = re.compile(r'^/_astro/(?:[A-Za-z0-9_.-]+\.(js|css)|fonts/[a-f0-9]+\.woff2)$')
_ROOT_ASSET = re.compile(r'^/[a-z][a-z0-9-]*\.(css|js)$')
_EXPLORER = re.compile(r'^/explorers/rel_[a-f0-9-]+/(explorer\.(css|js)|contrasts\.svg)$')


# ---- .assetsignore (gitignore semantics, as used by Wrangler) ---------------

def _translate(glob):
    """Translate one gitignore glob to a regex over a root-relative POSIX path."""
    out, i = [], 0
    while i < len(glob):
        if glob.startswith('**/', i):
            out.append('(?:.*/)?')
            i += 3
        elif glob.startswith('**', i):
            out.append('.*')
            i += 2
        elif glob[i] == '*':
            out.append('[^/]*')
            i += 1
        elif glob[i] == '?':
            out.append('[^/]')
            i += 1
        else:
            out.append(re.escape(glob[i]))
            i += 1
    return re.compile(''.join(out) + r'\Z')


def parse_rules(text):
    """Return (negated, directory_only, regex) rules in file order."""
    rules = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        negated = line.startswith('!')
        line = line[1:] if negated else line
        directory_only = line.endswith('/')
        line = line.strip('/')
        rules.append((negated, directory_only, _translate(line)))
    return rules


def _ignored(rules, path, is_dir):
    """Last matching rule wins; directory-only rules never match files."""
    ignored = False
    for negated, directory_only, pattern in rules:
        if directory_only and not is_dir:
            continue
        if pattern.match(path):
            ignored = not negated
    return ignored


def deployable(public_dir, rules):
    """Files Wrangler uploads: a file is excluded if it or any parent directory is ignored."""
    public_dir = Path(public_dir)
    files = []
    for file in sorted(p for p in public_dir.rglob('*') if p.is_file()):
        parts = file.relative_to(public_dir).parts
        parents = ['/'.join(parts[:n]) for n in range(1, len(parts))]
        if any(_ignored(rules, d, True) for d in parents):
            continue
        name = '/'.join(parts)
        if not _ignored(rules, name, False):
            files.append(name)
    return files


def inventory(public_dir):
    """Split the deployable set into byte-verified public assets and gated routes."""
    rules = parse_rules((Path(public_dir) / '.assetsignore').read_text())
    files = deployable(public_dir, rules)
    public = [name for name in files if name not in GATED]
    gated = {name: GATED[name] for name in files if name in GATED}
    return public, gated


# ---- Expected response headers (mirror of src/response-policy.ts) ----------

def expected_cache_control(name):
    """Anonymous GET of a 200 asset: presentation assets cache 5 min, the rest never."""
    path = '/' + name
    cacheable = bool(_FONT.match(path) or _LANDING.match(path)
                     or _ROOT_ASSET.match(path) or _EXPLORER.match(path))
    return 'public, max-age=300' if cacheable else 'no-store'


def expected_content_types(name):
    """Allowed media types, or None when the suffix has no fixed expectation (e.g. .py)."""
    return CONTENT_TYPES.get(PurePosixPath(name).suffix)
