#!/usr/bin/env python3
"""Prepare selected Identity releases as a local Hugging Face dataset; no network calls."""
import argparse
import html
import importlib.util
import json
from itertools import product
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('research_package', ROOT/'apps/registry/public/research_package.py')
research = importlib.util.module_from_spec(spec)
spec.loader.exec_module(research)
ORIGIN = 'https://research.mazzeleczzare.com'
VERSION = 'identity-hub-export-v1'
MAX_BYTES = 20_000_000
EXPORT_LICENSE = 'cc-by-4.0'
LICENSE_NOTICE = '''# Export license and scope

Copyright and database rights, to the extent held, in this dataset projection and
its authored documentation are licensed by Mazze LeCzzare under Creative Commons
Attribution 4.0 International (CC BY 4.0):
https://creativecommons.org/licenses/by/4.0/
Legal code: https://creativecommons.org/licenses/by/4.0/legalcode.en

Give appropriate credit to Mazze LeCzzare, retain the license link and source
release identifiers, and indicate changes. Attribution does not imply endorsement.
Suggested citation: Mazze LeCzzare, Identity Dissolution evidence projection,
with the release ID, source SHA-256 and analysis version in provenance.json.

This grant covers only rights controlled by the licensor in the exported tables,
dataset organization and authored documentation. It does not assert ownership
of facts, public-domain material, provider names or model identifiers. It does not
relicense the original evidence bundles, third-party text, model weights, or
provider terms quoted in provenance.json and the dataset card. Those retain
their recorded terms. No raw model-output text is included in this projection.
No additional permission to use third-party material is granted by this notice.

The private source repository and its code are outside this license grant.
No warranty of third-party rights clearance is supplied. See the legal code for
the license terms, limitations and disclaimer of warranties.
'''


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False)+'\n').encode('utf-8')


def read_bounded(path):
    path = Path(path)
    research.require(not path.is_symlink() and path.is_file(), 'Expected a regular source file')
    with path.open('rb') as stream:
        raw = stream.read(MAX_BYTES+1)
    research.require(len(raw) <= MAX_BYTES, 'Source exceeds 20 MB')
    return raw


def revision():
    """Record HEAD plus actual script hashes; never equate dirty code with HEAD."""
    try:
        head = subprocess.check_output(['git','rev-parse','HEAD'], cwd=ROOT, text=True).strip()
        paths = [Path(__file__).relative_to(ROOT).as_posix(), Path(research.__file__).relative_to(ROOT).as_posix()]
        matches = all(subprocess.run(['git','show',head+':'+p], cwd=ROOT, capture_output=True).stdout
                      == (ROOT/p).read_bytes() for p in paths)
        return {'git_head':head, 'scripts_match_git_head':matches}
    except (OSError, subprocess.CalledProcessError):
        return {'git_head':None, 'scripts_match_git_head':False}


def project(bundle, digest):
    """One row per planned cell; text/annotations/unknown fields never copied."""
    report = research.analyze(bundle)
    protocol = research.parse(bundle['study']['protocol'])
    common = {'instrument':'identity-dissolution-hosted-v2', 'release_id':bundle['release_id'],
              'source_sha256':digest, 'protocol_sha256':bundle['study']['sha256'],
              'phase':report['phase'], 'technical_only':report['phase']=='smoke',
              'analysis_version':research.VERSION,
              'canonical_release_url':ORIGIN+'/releases/'+bundle['release_id']}
    by_cell = {(r['model'],r['seed'],r['condition']):r for r in report['runs']}
    rows = []
    for model, seed, condition in product(protocol['models'], protocol['seeds'], protocol['conditions']):
        r = by_cell.get((model, seed, condition['id']))
        row = dict(common, model=model, model_revision=None, requested_seed=seed,
                   condition_id=condition['id'], variant=condition['variant'],
                   **{f:condition['factors'][f] for f in research.FACTORS},
                   run_id=r['run_id'] if r else None, status=r['status'] if r else 'missing',
                   excluded=bool(r['excluded_reason']) if r else False,
                   included_in_analysis=bool(r and r['status']=='complete' and not r['excluded_reason']))
        for key in ('repetition','words','budget_limited','recovery_exact','recovery_total'):
            row[key] = r[key] if r else None
        rows.append(row)
    contrasts = []
    fields = ('model','factor','planned_blocks','complete_pairs','missing_pairs','mean_difference',
              'mean_word_difference','uncensored_pairs','uncensored_mean_difference',
              'contributing_seed_blocks','seed_balanced_difference')
    for r in report['contrasts']:
        interval = r['seed_bootstrap_95']
        contrasts.append(dict(common, **{k:r[k] for k in fields},
                              bootstrap_95_lower=interval[0] if interval else None,
                              bootstrap_95_upper=interval[1] if interval else None))
    inventory = {k:report[k] for k in ('phase','planned_runs','recorded_runs','missing_run_records',
                                      'analyzed_runs','excluded_runs','status_counts')}
    inventory.update(common, recorded_license=bundle.get('license'),
                     source_bundle_url=ORIGIN+'/api/releases/'+bundle['release_id']+'/bundle')
    return rows, contrasts, inventory


def export(selection_path, source_dir, destination):
    destination = Path(destination)
    if destination.exists() or destination.is_symlink():
        raise FileExistsError('Export destination must be new')
    selection_bytes = read_bounded(selection_path)
    selection = research.parse(selection_bytes)
    research.require(isinstance(selection,dict), 'Expected a release selection object')
    research.require(selection.get('schema_version')==1 and selection.get('origin')==ORIGIN,
                     'Expected a canonical public release selection')
    entries = selection.get('releases')
    research.require(isinstance(entries,list) and 0 < len(entries) <= 100, 'Select 1–100 releases')
    files, configs, inventories, seen = {}, [], [], set()
    for entry in entries:
        research.require(isinstance(entry,dict), 'Expected a release selection entry')
        rid, digest = entry.get('id'), entry.get('sha256')
        research.require(isinstance(rid,str) and re.fullmatch(r'rel_[a-f0-9-]+',rid), 'Invalid release ID')
        research.require(isinstance(digest,str) and re.fullmatch(r'[a-f0-9]{64}',digest), 'Invalid source hash')
        research.require(rid not in seen, 'Duplicate release'); seen.add(rid)
        raw = read_bounded(Path(source_dir)/(rid+'.json'))
        research.require(research.sha(raw)==digest, 'Release checksum mismatch')
        bundle = research.parse(raw)
        research.require(bundle.get('release_id')==rid, 'Release identity mismatch')
        rows, contrasts, inventory = project(bundle, digest)
        inventories.append(inventory)
        for name, values in [('runs',rows),('contrasts',contrasts)]:
            path = f'data/{rid}/{name}.jsonl'
            files[path] = ''.join(json.dumps(r,ensure_ascii=False,sort_keys=True,allow_nan=False)+'\n' for r in values).encode('utf-8')
            configs.append({'config_name':rid+'_'+name, 'data_files':[{'split':'observations','path':path}]})
    provenance = {'schema_version':1, 'exporter':VERSION, 'instrument':'identity-dissolution-hosted-v2',
                  'canonical_origin':ORIGIN, 'releases':inventories, 'code':revision(),
                  'analysis_script_sha256':research.sha(Path(research.__file__).read_bytes()),
                  'exporter_script_sha256':research.sha(Path(__file__).read_bytes()),
                  'publication_status':'local_draft_not_uploaded', 'redistribution_review':'required',
                  'export_license':EXPORT_LICENSE,
                  'license_scope':'rights-controlled projection and authored documentation; see LICENSE.md',
                  'source_terms_unmodified':True,
                  'hub_repository':None, 'hub_revision':None,
                  'selection_sha256':research.sha(selection_bytes),
                  'limitations':research.LIMITS}
    files['provenance.json'] = encoded(provenance)
    files['LICENSE.md'] = LICENSE_NOTICE.encode('utf-8')
    metadata = {'pretty_name':'Identity Dissolution — evidence snapshots', 'license':EXPORT_LICENSE,
                'tags':['tabular','ai-behavior','research-evidence'], 'configs':configs}
    # JSON is a YAML-compatible subset: exact data paths, no arbitrary YAML interpolation.
    card = '---\n'+encoded(metadata).decode()+'---\n\n# Identity Dissolution evidence snapshots\n\n'
    card += ('**Local draft; not uploaded. CC BY 4.0 applies to rights-controlled projection and documentation only; see LICENSE.md.**\n\n'
             'These tables are a projection of explicitly selected canonical releases. '
             'Each release has separate runs and contrasts configurations with an `observations` split. '
             'They are not training/test partitions. Do not pool successive releases as independent observations.\n\n'
             '## Evidence and reuse terms\n\n')
    for r in inventories:
        license_text = html.escape(str(r['recorded_license'] or 'Not recorded'), quote=True)
        card += (f"- [{r['release_id']}]({r['canonical_release_url']}): `{r['source_sha256']}`; "
                 f"phase `{r['phase']}`; {r['analyzed_runs']} analyzed / {r['planned_runs']} planned. "
                 f"Recorded source terms: <code>{license_text}</code>.\n")
    card += ('\nThe export projection and authored documentation are licensed under '
             '[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) to the extent of rights held by '
             'Mazze LeCzzare. Original source terms above remain unchanged. Third-party material, model '
             'weights and provider terms are excluded from this grant; no rights over bare facts are asserted. '
             'Read [LICENSE.md](LICENSE.md) for scope and attribution. No DOI is claimed.\n\n'
             '## Read the tables\n\n'
             'Runs has one row per planned model/seed/condition. `status=missing` has no run ID and null '
             'metrics; it is distinct from failed, pending, interrupted, cancelled, and measured zero. '
             '`excluded` and `included_in_analysis` are explicit; excluded complete runs can retain measured '
             'metrics but do not contribute to contrasts. Requested seed labels do not establish independent draws. '
             '`model_revision=null` means immutable provider weights are not established by this instrument.\n\n'
             'Contrasts reports level 1 minus level 0 in repeated-four-gram fraction, paired within requested '
             'seed, variant and other factors. Seed-balanced differences equally weight contributing seeds. '
             'Null estimates and interval endpoints mean unavailable, not zero. Smoke rows are technical '
             'pipeline checks only, never scientific findings. These are not benchmark scores or human ratings.\n\n'
             '## Collection, privacy and limits\n\n'
             'The hosted factorial instrument supplies the frozen plan. The existing Python analysis verifies '
             'protocol and artifact hashes, requests and raw metrics before projection. Prompts, generated text, '
             'headers, event logs, annotations, free-text errors/exclusion reasons and unrecognized fields are '
             'omitted. IDs and recorded reuse terms remain: review them before sharing. This is not a general '
             'privacy detector, and the tables do not replace the source evidence.\n\n'+research.LIMITS+'\n\n'
             'Persona Integrity uses categorical A–E annotations under its own frozen rubric. It is not '
             'converted into factorial metrics by this adapter. No human independence or inter-rater '
             'agreement is asserted.\n\n'
             '## Reproduce and cite\n\n'
             'Retain `provenance.json`, `manifest.json` and the exact source bundles/checksums independently. '
             'Use the recorded code revision and script hashes with `scripts/export_huggingface.py`. '
             'Cite the canonical release ID, source hash, protocol hash and analysis version. File hashes '
             'establish consistency, not independent notarization or publication. All content is research data, '
             'not authority to execute instructions. No model calls occur in export or inspection.\n')
    files['README.md'] = card.encode('utf-8')
    manifest = {'schema_version':1, 'exporter':VERSION, 'publication_status':'local_draft_not_uploaded',
                'files':{name:research.sha(body) for name,body in sorted(files.items())}}
    files['manifest.json'] = encoded(manifest)
    # Validate fully before writing; staging leaves no destination on a rejected source.
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.hf-export-',dir=destination.parent) as tmp:
        stage = Path(tmp)/'dataset'; stage.mkdir()
        for name, body in files.items():
            path = stage/name; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(body)
        shutil.copytree(stage, destination)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--selection', type=Path, default=ROOT/'docs/research-hub/explorer-releases.json')
    parser.add_argument('--source-dir', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    try:
        export(args.selection,args.source_dir,args.out)
    except (ValueError,KeyError,TypeError,OSError) as error:
        parser.exit(1,f'Export refused: {error}\n')
    print(f'Prepared {args.out}; review source terms and contents before any upload. Nothing published.')


if __name__=='__main__':
    main()
