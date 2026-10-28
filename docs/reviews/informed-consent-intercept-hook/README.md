# Review: Informed-Consent Intercept Hook

| File | What it is |
|---|---|
| [spec-v1.0.0.md](spec-v1.0.0.md) | The specification as submitted, verbatim |
| [touchstone-report_v1.0.0.md](touchstone-report_v1.0.0.md) | Adversarial verification of v1.0 — verdict: did not hold |
| [review_stele-mapping_v1.0.0.md](review_stele-mapping_v1.0.0.md) | Opinionated review and mapping onto Stele's ZANSHIN→EPOCHÉ state machine |
| [probes/](probes/) | Runnable probes behind every executed v1.0 finding |
| [spec-v1.1.0.md](spec-v1.1.0.md) | **Draft v1.1** — the hook rebuilt as a policy enforcement point, in Rust |
| [reference/](reference/) | v1.1 reference implementation: `icih-core` (pure, tested), `icih-worker` (Cloudflare Workers adapter), `e2e/smoke.py` |

Status: v1.1 is built and tested locally (29 core tests, 21/21 end-to-end
checks against local `wrangler dev`); it is **not deployed**. No finding here
is an empirical result about model behavior.

## Run the reference

```sh
cd reference
cargo test -p icih-core                                   # 29 tests
cargo clippy -p icih-worker --target wasm32-unknown-unknown -- -D warnings
# end-to-end: see the header of e2e/smoke.py
```
