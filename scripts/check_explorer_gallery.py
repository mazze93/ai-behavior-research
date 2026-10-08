#!/usr/bin/env python3
"""Refuse deployment of absent, stale, extra or changed generated gallery assets."""
import argparse
import hashlib
import json
from pathlib import Path
import re
from gallery_inputs import ROOT, renderer_hash

OUTPUTS={'index.html','contrasts.svg','explorer.css','explorer.js','view-manifest.json'}
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def require(ok,message):
    if not ok:raise ValueError(message)
def check(gallery,selection):
    gallery=Path(gallery);selection=Path(selection)
    require(gallery.is_dir() and not gallery.is_symlink(),'Gallery is missing; build it before deployment')
    paths=list(gallery.rglob('*'))
    require(not any(p.is_symlink() for p in paths),'Gallery symlinks are forbidden')
    config=json.loads(selection.read_text());entries=config['releases']
    require(config['schema_version']==1 and config['origin']=='https://research.mazzeleczzare.com','Unsupported gallery selection')
    require(isinstance(entries,list) and 0<len(entries)<=100,'Invalid release selection')
    for r in entries:
        require(isinstance(r.get('id'),str) and re.fullmatch(r'rel_[a-f0-9-]+',r['id']) and isinstance(r.get('sha256'),str) and re.fullmatch(r'[a-f0-9]{64}',r['sha256']),'Invalid release identity')
    require(len({r['id'] for r in entries})==len(entries),'Duplicate releases')
    expected={'index.html','index.json','build-manifest.json'}|{r['id']+'/'+name for r in entries for name in OUTPUTS}
    actual={p.relative_to(gallery).as_posix() for p in paths if p.is_file()}
    require(actual==expected,'Gallery inventory differs from selected releases/output allowlist')
    proof=json.loads((gallery/'build-manifest.json').read_text())
    for field,path in [('release_manifest_sha256',selection),('analysis_script_sha256',ROOT/'apps/registry/public/research_package.py'),('builder_script_sha256',ROOT/'scripts/build_explorer_gallery.py')]:
        require(proof.get(field)==sha(path),'Stale gallery input: '+field)
    require(set(proof['files'])==expected-{'build-manifest.json'},'Incomplete gallery hash inventory')
    for name,digest in proof['files'].items():require(sha(gallery/name)==digest,'Changed gallery file: '+name)
    index=json.loads((gallery/'index.json').read_text())
    require([(r['id'],r['sha256']) for r in index]==[(r['id'],r['sha256']) for r in entries],'Gallery index differs from selection')
    for r in entries:
        view=json.loads((gallery/r['id']/'view-manifest.json').read_text())
        require(view.get('release_id')==r['id'] and view.get('source_sha256')==r['sha256'],'View source identity mismatch')
        require(view.get('renderer_source_sha256')==renderer_hash(),'Stale compiled renderer; rebuild gallery')
        require(set(view['files'])==OUTPUTS-{'view-manifest.json'},'Unexpected renderer output')
        for name,digest in view['files'].items():require(sha(gallery/r['id']/name)==digest,'Changed view file')
    return len(actual)
def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--gallery',type=Path,default=ROOT/'apps/registry/public/explorers')
    p.add_argument('--selection',type=Path,default=ROOT/'docs/research-hub/explorer-releases.json')
    args=p.parse_args()
    try:count=check(args.gallery,args.selection)
    except (ValueError,OSError,KeyError,TypeError) as error:p.exit(1,f'Gallery check refused: {error}\n')
    print(f'Gallery check passed: {count} exact generated assets; current sources and selected public releases.')
if __name__=='__main__':main()
