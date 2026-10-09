#!/usr/bin/env python3
"""Prepare an evidence brief for RustPress; never stage or publish it automatically."""
import argparse
import hashlib
import html
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('research_package', ROOT/'apps/registry/public/research_package.py')
research = importlib.util.module_from_spec(spec)
spec.loader.exec_module(research)
RUSTPRESS_REVISION = 'fbca30d018a5d8f0b38d2f2e3f30989424d9d0aa'

def text(value):
    return html.escape(str(value), quote=True)

def export(raw, expected_hash, destination):
    research.require(len(raw) <= 20_000_000, 'Bundle exceeds 20 MB')
    research.require(hashlib.sha256(raw).hexdigest() == expected_hash, 'Release checksum mismatch')
    bundle = research.parse(raw)
    report = research.analyze(bundle)
    protocol = research.parse(bundle['study']['protocol'])
    scope = ('Technical smoke evidence only; no research findings are asserted.' if report['phase'] == 'smoke'
             else 'Post-hoc exploratory analysis; author review is required before interpreting the contrasts.')
    title = bundle['study']['title'] + ' — evidence brief'
    metadata_title = json.dumps(title,ensure_ascii=False).replace('<',r'\u003c').replace('>',r'\u003e').replace('&',r'\u0026')
    rows = ''.join('<tr>' + ''.join('<td>'+text(value)+'</td>' for value in
        (r['model'],r['factor'],r['complete_pairs'],r['missing_pairs'],
         'Not estimable' if r['seed_balanced_difference'] is None else format(r['seed_balanced_difference'],'.6g')))
        + '</tr>' for r in report['contrasts'])
    statuses = ''.join('<li>'+text(k)+': '+str(v)+'</li>' for k,v in report['status_counts'].items())
    # URLs are intentionally plain text: RustPress's corpus policy forbids external hrefs.
    document = ('---\ntitle: '+metadata_title+'\ndescription: "Source-linked research evidence brief for editorial review"\ntags: [research, evidence]\ndraft: false\n---\n'
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>'+text(title)+'</title></head><body><main>'
        '<h1>'+text(title)+'</h1><p><strong>Review before pressing. This is not a submission-ready paper.</strong></p>'
        '<p>'+scope+'</p><h2>Source identity</h2><dl><dt>Release</dt><dd>'+text(bundle['release_id'])+'</dd>'
        '<dt>Bundle SHA-256</dt><dd><code>'+text(expected_hash)+'</code></dd>'
        '<dt>Frozen protocol SHA-256</dt><dd><code>'+text(bundle['study']['sha256'])+'</code></dd>'
        '<dt>Analysis specification</dt><dd>'+text(research.VERSION)+'</dd></dl>'
        '<h2>Methods</h2><h3>Frozen hypothesis</h3><p>'+text(protocol.get('hypothesis','Not recorded'))+'</p>'
        '<h3>Frozen analysis plan</h3><p>'+text(protocol.get('analysis_plan','Not recorded'))+'</p>'
        '<h2>Evidence inventory</h2><p>Planned: '+str(report['planned_runs'])+'; recorded: '+str(report['recorded_runs'])+
        '; analyzed: '+str(report['analyzed_runs'])+'; excluded: '+str(report['excluded_runs'])+
        '; missing run records: '+str(report['missing_run_records'])+'.</p><ul>'+statuses+'</ul>'
        '<h2>Descriptive comparisons</h2><p>Differences in repeated-four-gram fraction, equally weighted across contributing requested seeds. '
        'Pairs match on authored variant and other factors. Missing estimates are not zero. These are descriptive records, not causal findings.</p>'
        '<table><caption>Seed-balanced factorial comparisons</caption><thead><tr><th scope="col">Model</th><th scope="col">Factor</th>'
        '<th scope="col">Complete pairs</th><th scope="col">Missing pairs</th><th scope="col">Difference (fraction)</th></tr></thead><tbody>'+rows+'</tbody></table>'
        '<h2>Limits</h2><p>'+text(report['limitations'])+'</p>'
        '<p>Content hashes establish consistency, not independent notarization. No publication, DOI deposit, or new experiment was performed by this exporter.</p>'
        '<h2>Cite and retrieve the evidence</h2><p>'+text(bundle.get('citation','Citation unavailable'))+'</p>'
        '<p>Reuse terms: '+text(bundle.get('license','Not recorded; resolve before publication'))+'</p>'
        '</main></body></html>')
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=False)
    corpus = destination/'corpus'
    corpus.mkdir()
    payload = document.encode('utf-8')
    (corpus/'evidence.html').write_bytes(payload)
    manifest = {'schema_version':1,'exporter':'rustpress-evidence-brief-v1','rustpress_policy_revision':RUSTPRESS_REVISION,
        'release_id':bundle['release_id'],'source_sha256':expected_hash,'protocol_sha256':bundle['study']['sha256'],
        'analysis_version':research.VERSION,'analysis_script_sha256':research.sha(Path(research.__file__).read_bytes()),
        'exporter_script_sha256':research.sha(Path(__file__).read_bytes()),
        'files':{'corpus/evidence.html':research.sha(payload)},'publication_status':'not_staged_or_published',
        'review_required':True,'citation':bundle.get('citation'),'license':bundle.get('license')}
    (destination/'export.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (destination/'README.txt').write_text('Review corpus/evidence.html and the source evidence before pressing.\n'
        'Pass only the corpus directory to RustPress stage; export.json is a provenance sidecar, not corpus input.\n'
        'Retain the source bundle and export.json independently. Retain the seal from RustPress stage; verify/deploy must use that expected seal.\n'
        'No RustPress command has been run by this exporter. External evidence URLs are plain citation text under the current corpus policy.\n',encoding='utf-8')
    return manifest

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('bundle',type=Path)
    parser.add_argument('expected_sha256')
    parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args()
    try:
        export(args.bundle.read_bytes(),args.expected_sha256,args.out)
    except (ValueError,KeyError,TypeError,OSError) as error:
        parser.exit(1,f'Export refused: {error}\n')
    print(f'Prepared {args.out}/corpus for editorial review; nothing published.')

if __name__=='__main__':main()
