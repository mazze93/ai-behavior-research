# Evidence explorer (Rust)

Generate a local interactive explorer and standalone SVG figure from an Identity Dissolution analysis package. No network requests, model calls, publication or changes to experiments occur while rendering.

```sh
# First build the package with the reviewed Python analysis engine.
python3 apps/registry/public/research_package.py RELEASE.json EXPECTED_SOURCE_SHA256 --out package
cargo run --release --locked --manifest-path tools/evidence-explorer/Cargo.toml -- package EXPECTED_SOURCE_SHA256 new-explorer
```

Open `new-explorer/index.html` in a browser. The output directory must not exist. The matrix links each recorded cell to its source run. Models can be hidden in the coverage view; the contrast figure and its exact-value table always retain all models. Missing or excluded observations stay labeled and are not plotted as zero. Smoke reports support no research findings and cannot display bootstrap intervals.

The output contains `index.html`, `contrasts.svg`, `explorer.css`, `explorer.js` and `view-manifest.json`. Keep them together. The manifest records source/report hashes and output hashes, renderer/analysis versions and all-model scope. Retain the source repository revision and original package to reproduce it. Source records are embedded in the HTML: review content and reuse terms before sharing. The CLI works locally. A separate explicit gallery builder supports hosted views; browser-only package import is not implemented.

## Verification boundary

The reader checks a separately supplied source SHA-256, the manifest's source/report hashes, frozen protocol hash, supported analysis version, plan/run identity, inventories, metric ranges and comparison shape. These are consistency checks, **not independent recomputation of the Python statistics or raw response metrics**. A manifest can be rewritten; it is not a signature. Only use reports generated with the reviewed analysis builder and retain its source revision.

Inputs are bounded to 20 MB per file and 10,000 planned cells. Terminal input symlinks are refused, but this is not an adversarial filesystem sandbox. Output creation refuses an existing directory; an I/O error may leave a partial new directory, which must not be treated as a completed export.

## Checks

Tested with Rust 1.98.1. Cargo.lock pins the dependency graph. The CI job runs formatting, Clippy, Rust tests and a cross-language roundtrip from the real Python fixture/builder.

```sh
cargo fmt --manifest-path tools/evidence-explorer/Cargo.toml -- --check
cargo clippy --manifest-path tools/evidence-explorer/Cargo.toml --locked --all-targets -- -D warnings
cargo test --manifest-path tools/evidence-explorer/Cargo.toml --locked
cargo build --manifest-path tools/evidence-explorer/Cargo.toml --locked
PYTHONDONTWRITEBYTECODE=1 python3 tools/evidence-explorer/tests/package_roundtrip.py
```

Rust uses [Serde JSON](https://docs.rs/serde_json/1.0.151/serde_json/) for structured input and [RustCrypto SHA-2](https://docs.rs/sha2/0.10.9/sha2/) for file fingerprints. Browser JavaScript only handles the model selector and source-detail navigation; it performs no statistical calculation.

## Hosted gallery

The checked-in selection is `docs/research-hub/explorer-releases.json`. Place only already-public bundles in a separate source directory, named `RELEASE_ID.json`. Review changes to this selection before a gallery build. The builder makes no network requests and never deploys; it runs the reviewed Python verifier and the built Rust renderer.

```sh
cargo build --manifest-path tools/evidence-explorer/Cargo.toml --locked
python3 scripts/build_explorer_gallery.py --source-dir /absolute/public-release-cache --out apps/registry/public/explorers
```

The destination must be absent. Move any previous generated gallery to a backup before rebuilding; do not mix editions. Generated files are Git-ignored. The exact public release hashes, builder code and asset allowlist are version-controlled. `build-manifest.json` inventories the generated outputs and analysis/builder source hashes. Preserve the build manifest with the deployment record. A clean checkout must build the gallery before deployment; otherwise its navigation link will not resolve.

The renderer emits external same-origin CSS/JavaScript and discrete color classes, preserving the site's existing CSP. `.assetsignore` explicitly permits only the gallery index, manifests and five renderer output names. Neither source bundles nor Python package directories belong in static assets. The site menu is updated through the analysis desk. Hosted viewing is read-only and runs no inference.
