"""Reject tracked private state and generated artifacts; not a general secret scanner."""
from pathlib import PurePosixPath
import subprocess

paths = subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0')
bad = []
for name in filter(None, paths):
    p = PurePosixPath(name)
    if (set(p.parts) & {'node_modules', '.wrangler', '__pycache__', 'runs', '.openai'}
        or p.name.startswith(('.dev.vars', '.env'))
        or '/data/private/' in '/' + name or '/data/raw/' in '/' + name
        or p.suffix in {'.pem', '.key', '.sqlite', '.db', '.zip', '.pyc'}):
        bad.append(name)
if bad:
    raise SystemExit('Disallowed tracked files:\n' + '\n'.join(bad))
print('Tracked-file boundary check passed (not a comprehensive secret scan).')
