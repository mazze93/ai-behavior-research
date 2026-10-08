"""Versioned renderer input order, matching Rust's compiled-source fingerprint."""
from pathlib import Path
import hashlib
ROOT=Path(__file__).resolve().parents[1]
RENDERER=ROOT/'tools/evidence-explorer'
RENDERER_INPUTS=('src/lib.rs','src/main.rs','src/render.rs','src/shell.html','src/view.css','src/view.js','Cargo.toml','Cargo.lock')
def renderer_hash():
    return hashlib.sha256(b''.join((RENDERER/name).read_bytes() for name in RENDERER_INPUTS)).hexdigest()
