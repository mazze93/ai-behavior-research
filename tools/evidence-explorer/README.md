# Evidence explorer (Rust)

A local, deterministic reader for `hosted-factorial-package-v1` packages. Rendering is under development on this branch.

The reader checks a separately supplied source SHA-256, the manifest's source/report hashes, frozen protocol hash, supported analysis version, plan/run identity, inventories, metric ranges and comparison shape. Missing estimates stay missing. Smoke intervals are rejected. These are consistency checks, **not independent recomputation of the Python statistics or raw response metrics**. A manifest can be rewritten; it is not a signature. Only use reports generated with the reviewed analysis builder and retain its source revision.

Inputs are bounded to 20 MB per file and 10,000 planned cells. No network or model calls. No publishing or changes to experiments.

```sh
cargo test --manifest-path tools/evidence-explorer/Cargo.toml --locked
```

Tested with Rust 1.98.1. Dependencies are locked; no new toolchain installation is required on the development host.
