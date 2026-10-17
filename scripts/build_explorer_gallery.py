#!/usr/bin/env python3
"""Build only explicitly listed public-release explorers; never fetch or publish."""
import argparse
import hashlib
import html
import importlib.util
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from gallery_inputs import renderer_hash

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('research_package', ROOT/'apps/registry/public/research_package.py')
analysis = importlib.util.module_from_spec(spec)
spec.loader.exec_module(analysis)

def build(manifest_path, source_dir, destination, binary):
    destination=Path(destination)
    if destination.exists() or destination.is_symlink():
        raise FileExistsError('Gallery destination must be new')
    manifest=analysis.parse(Path(manifest_path).read_text())
    analysis.require(manifest.get('schema_version')==1 and manifest.get('origin')=='https://research.mazzeleczzare.com','Unsupported gallery manifest')
    entries=manifest.get('releases')
    analysis.require(isinstance(entries,list) and 0<len(entries)<=100,'Expected 1–100 explicitly selected releases')
    seen=set()
    for row in entries:
        analysis.require(isinstance(row,dict) and isinstance(row.get('id'),str) and re.fullmatch(r'rel_[a-f0-9-]+',row['id']) and isinstance(row.get('sha256'),str) and re.fullmatch(r'[a-f0-9]{64}',row['sha256']),'Malformed release identity')
        analysis.require(row['id'] not in seen,'Duplicate release');seen.add(row['id'])
    with tempfile.TemporaryDirectory(prefix='research-gallery-') as temp:
        work=Path(temp);gallery=work/'gallery';gallery.mkdir();index=[]
        for row in entries:
            source=Path(source_dir)/(row['id']+'.json')
            analysis.require(not source.is_symlink(),'Symlink source refused')
            with source.open('rb') as stream:raw=stream.read(20_000_001)
            analysis.require(len(raw)<=20_000_000 and analysis.sha(raw)==row['sha256'],'Release checksum mismatch')
            bundle=analysis.parse(raw)
            analysis.require(bundle['release_id']==row['id'],'Release identity mismatch')
            package=work/(row['id']+'-package')
            report=analysis.build_package(raw,row['sha256'],package)
            subprocess.run([str(Path(binary).resolve()),str(package),row['sha256'],str(gallery/row['id'])],check=True,capture_output=True,text=True)
            view=analysis.parse((gallery/row['id']/'view-manifest.json').read_text())
            analysis.require(view.get('renderer_source_sha256')==renderer_hash(),'Renderer binary is stale; rebuild with Cargo')
            index.append(dict(row,title=bundle['study']['title'],phase=report['phase'],analyzed_runs=report['analyzed_runs'],planned_runs=report['planned_runs'],href=f"/explorers/{row['id']}/index.html"))
        (gallery/'index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n')
        cards=''.join('<article class="card"><h2>'+html.escape(r['title'])+'</h2><p>'+html.escape(r['phase'])+' · '+str(r['analyzed_runs'])+' analyzed / '+str(r['planned_runs'])+' planned</p><p class="hash">'+r['sha256']+'</p><p><a href="'+r['href']+'">Open visual evidence →</a> · <a href="/releases/'+r['id']+'">Original release</a></p></article>' for r in index)
        (gallery/'index.html').write_text('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Visual evidence / Research</title><link rel="stylesheet" href="/type.css"><link rel="stylesheet" href="/hub.css"></head><body><header><a class="wordmark" href="/">MAZZE LECZZARE / RESEARCH</a><nav><a href="/prepare.html">Analysis desk</a></nav></header><main><p class="kicker">Identity Dissolution / reviewed release selection</p><h1>Visual<br>evidence.</h1><div class="spectrum"></div><p class="notice">Smoke releases document technical execution only. Missing observations are not zero; no research findings are asserted. Views are generated from checksum-pinned public evidence using the Python verifier and Rust renderer.</p><div class="release-list">'+cards+'</div><p>Only explicitly selected releases appear here. Each explorer includes its source and analysis hashes, interpretation limits and downloadable figure. No model calls run when you open a view.</p></main></body></html>')
        files={p.relative_to(gallery).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(gallery.rglob('*')) if p.is_file()}
        (gallery/'build-manifest.json').write_text(json.dumps({'schema_version':1,'release_manifest_sha256':analysis.sha(Path(manifest_path).read_bytes()),'analysis_script_sha256':analysis.sha(Path(analysis.__file__).read_bytes()),'builder_script_sha256':analysis.sha(Path(__file__).read_bytes()),'files':files},indent=2)+'\n')
        shutil.copytree(gallery,destination)
    return index

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest',type=Path,default=ROOT/'docs/research-hub/explorer-releases.json')
    parser.add_argument('--source-dir',type=Path,required=True)
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--binary',type=Path,default=ROOT/'tools/evidence-explorer/target/debug/evidence-explorer')
    args=parser.parse_args()
    build(args.manifest,args.source_dir,args.out,args.binary)
    print('Prepared gallery; no fetch, deployment, or new evidence publication performed.')
if __name__=='__main__':main()
