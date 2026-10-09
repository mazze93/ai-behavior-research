# Research evidence → RustPress editorial brief

The lab records and analyzes evidence; [RustPress](https://github.com/mazze93/rustpress) can publish reviewed accounts at https://press.mazzeleczzare.com/. This bridge prepares a brief from a verified public Identity Dissolution schema-v2 release. It does not publish, launch inference, or alter either site's deployment. GitHub remains the source repository, the registry remains the evidence origin, and a future Hugging Face mirror remains a distribution channel.

## Prepare and review

From the research repository, using an independently retained release checksum:

```sh
python3 scripts/export_rustpress.py /absolute/release.json EXPECTED_BUNDLE_SHA256 --out /absolute/new-export
```

The exporter verifies the bundle with the existing analysis engine, including protocol/artifact hashes and derived metrics. It refuses an existing destination. It writes:

- `corpus/evidence.html`: escaped, policy-constrained brief with source identities, methods, inventory, descriptive contrasts, limitations and citation.
- `export.json`: source, analysis script, exporter script and output hashes; reviewed policy revision; explicit unpublished status.
- `README.txt`: handoff instructions.

Smoke evidence is labeled technical-only. Other releases remain post-hoc exploratory. Missing estimates are not zero. No DOI or publication status is invented. The brief does not include raw response bodies or private annotation journals; review the title, methods, citation and reuse terms before sharing. This exporter is not a general privacy classifier.

Review the complete analysis package alongside the brief: the compact comparison table is not a replacement for its uncertainty estimates and sensitivity analysis. Keep the exact source bundle, manifest and source revision independently. The manifest hashes the exporter but does not embed it; retain the repository revision for reproduction.

## RustPress compatibility boundary

Verified against `mazze93/rustpress` revision `fbca30d018a5d8f0b38d2f2e3f30989424d9d0aa`, Rust 1.98.1. The corpus policy rejects scripts, embedded documents, external links/resources, inline styles, SVG and JSON assets. Evidence URLs therefore appear as plain citation text. Pass **only `corpus/`** to RustPress, never the parent directory with its JSON sidecar. Interactive visualizations stay in the research lab; a later publication exporter can provide supported static raster figures with provenance.

The frontmatter uses `draft: false` so the reviewed brief can be compiled. The exporter never invokes RustPress; the review notice is procedural, not an enforced approval mechanism. Human approval, scientific review and release authority must remain explicit in any future automated integration.

For a repeatable policy check, copy `scripts/rustpress_compatibility.rs` into a disposable checkout of the pinned RustPress revision as `tests/research_bridge.rs`, then run there:

```sh
RESEARCH_EXPORT_HTML=/absolute/new-export/corpus/evidence.html cargo test --locked --test research_bridge
```

The test invokes the real compiler and `validate_pressed`. RustPress adds an index to the single-document input. This check does not exercise Astro staging, seals, deployment or the trusted site template. It is optional and not part of this repository's Python CI; repeat it when either content policy or the exporter changes.

After editorial review, RustPress's established lifecycle is stage → verify → deploy. Use a new release label, preserve the independently retained **stage seal**, and pass that seal to `--expect`. The bundle checksum and stage seal identify different objects; never substitute one for the other. Inspect the full staged site and run its deployment dry run before publishing. A new pressing can replace the site's corpus, so combine the approved brief with the intended existing corpus before staging; do not deploy a one-brief test as an accidental replacement edition. The only RustPress destination is `press.mazzeleczzare.com`.

## Verification, 2026-10-08

The real public smoke release `rel_eb5c703f-d012-4f4e-ab1d-cea28ba48642`, SHA-256 `323076f506e34a9daa19f8525e463932a104d756765a666628130d05a352a50d`, was exported and accepted by the pinned RustPress compiler and pressed-content validator. Python tests cover escaping hostile metadata, checksum rejection, provenance and refusing overwrite. No pressing was staged or deployed. Hashes establish consistency, not signatures or independent notarization.

The next useful publication increment is a reviewed claim/evidence/limitation narrative with static figures from the native visual explorer. Human and agent contributions should carry distinct attribution and review state; an agent-authored brief is not independent scientific corroboration.
