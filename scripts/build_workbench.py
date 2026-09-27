"""Build static workbench and deterministic local-runner download, without secrets."""
from pathlib import Path
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
study = ROOT / 'studies/identity-dissolution'
target = ROOT / 'build/workbench'
target.mkdir(parents=True, exist_ok=True)
shutil.copytree(ROOT / 'apps/workbench/public', target, dirs_exist_ok=True)
for name in ('README.md', 'PROTOCOL.md'):
    shutil.copyfile(study / name, target / name)
reports = sorted((study / 'examples').glob('*/report.md'))
if not reports:
    raise SystemExit('Missing synthetic demonstration report')
shutil.copyfile(reports[0], target / 'demo-report.md')
files = [study / name for name in ('README.md', 'PROTOCOL.md', 'research.py')]
files += sorted((study / 'configs').glob('*.json'))
files += sorted((study / 'tests').glob('*.py'))
with zipfile.ZipFile(target / 'research-project.zip', 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for path in files:
        entry = zipfile.ZipInfo(path.relative_to(study).as_posix(), (2026, 1, 1, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o100644 << 16
        archive.writestr(entry, path.read_bytes())
print(target)
