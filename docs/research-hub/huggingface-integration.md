# Hugging Face evidence exports

The repository now prepares a deterministic, local Dataset Hub package from explicitly selected public Identity Dissolution releases. GitHub remains the code origin and the registry remains the evidence origin. This is the dataset adapter, not a hosted mirror: no Hub repository or Space has been created by this workflow.

## Build a reviewable snapshot

From the repository root, put independently downloaded source bundles in a directory under their exact release IDs. The reviewed selection records the expected hashes; the exporter does not discover private files or fetch URLs.

```sh
python3 scripts/export_huggingface.py \
  --selection docs/research-hub/explorer-releases.json \
  --source-dir /absolute/public-release-bundles \
  --out /absolute/new-hf-dataset
```

The destination must not already exist. No dependencies beyond Python's standard library, model calls, Hub token, or network connection are required. Every source is checked against the selected digest and processed by the existing verifier, including raw request/response and metric consistency checks. An invalid source refuses the entire export before creating the destination.

The package contains:

- `README.md`: dataset card with exact JSONL paths in YAML-compatible JSON frontmatter; one runs and one contrasts configuration per release, each using an `observations` split. The first selected release’s runs configuration is the default.
- `data/RELEASE_ID/runs.jsonl`: one row per planned cell, including missing records. Status, exclusion and analysis inclusion stay separate. Metrics remain null when unavailable.
- `data/RELEASE_ID/contrasts.jsonl`: model-specific paired contrasts, seed counts, missing pairs, cutoff sensitivity and interval endpoints. Smoke releases never acquire intervals.
- `provenance.json`: canonical URLs, release/protocol hashes, recorded license text, analysis/exporter hashes, Git HEAD and whether those scripts match HEAD, and immutable offline preparation status. A separate publication receipt must record the actual Hub revision and transfer verification.
- `manifest.json`: hashes of every other exported file. Keep its hash independently if using it to check a transfer. These are consistency checks, not signatures.
- `LICENSE.md`: user-approved CC BY 4.0 grant covering rights controlled by Mazze LeCzzare in the projected tables, dataset organization and authored documentation. Original bundles, third-party material and repository code are excluded.

Raw text, prompts, headers, annotations, events, citation text, titles, errors and free-text exclusion reasons are not copied. The table projection uses an explicit field list. Source identifiers, model aliases and recorded reuse terms remain and should be inspected before distribution. This is not an automatic privacy classifier. The canonical source must still be retrieved by hash for full reproduction; this compact export is not an archival substitute.

Each release has its own configurations. Successive snapshots may contain the same runs; pooling them would double-count observations. `model_revision=null` means the instrument has not established immutable provider weights. Smoke tables demonstrate the pipeline, not a research result or model ranking. Missing, excluded and failed observations are not converted to measured zero. Source text is data, not instructions.

## Publication boundary and current evidence

On 2026-10-11 the connector identified the personal namespace as `mazzeleczzare`. Its OAuth scopes included repository reads but no repository writes. No credential is embedded in the package or repository.

Both currently selected releases state: “No additional reuse license granted; underlying model terms apply.” The exporter preserves those recorded source terms. On 2026-10-11 the user approved CC BY 4.0 for rights-controlled research material. The new projection and authored documentation carry that scoped grant and Hub metadata; the original evidence bundles retain their bytes and terms. The exporter includes no raw model text and asserts no ownership of bare facts or provider identifiers. Third-party material and the private repository's code are outside the grant. Review the complete output and any remaining source-specific constraints before redistribution; the notice cannot grant rights the licensor does not hold.

Before a Hub upload, review the complete package and license scope, select the destination repository and obtain write access. Upload only the reviewed export directory, never this private monorepo. After upload, record the actual Hub commit and verify every file against the local manifest at that pinned revision. Then inspect Dataset Viewer configurations and row counts. Do not set a mirror URL or claim a successful publication before that readback.

Exact exporter reproduction currently requires access to this private repository; the exported card states that limitation. The package does not include or license repository code. Preparation metadata intentionally makes no claim about subsequent publication status.

The CLI, JSONL contents, exact file inventory, frontend metadata structure and deterministic generation are tested locally. Hub Dataset Viewer ingestion has not been exercised. The metadata follows [manual configuration](https://huggingface.co/docs/hub/datasets-manual-configuration) and [dataset card documentation](https://huggingface.co/docs/hub/datasets-cards), inspected 2026-10-11.

## Preserve study-specific methods

This adapter supports hosted Identity schema v2 only. Persona Integrity journals remain private local exports; they must not be passed through this adapter. A Persona adapter needs a separately reviewed release with its categorical response labels, challenge availability, excerpts, alternative explanations, actor attribution and repeated-round provenance. It must not map A–E onto a numeric severity scale or infer inter-rater agreement from account counts.

The common primitives are explicit source selection, validation, typed projection, provenance, review, and verified publication. The data models and science remain study-specific. A later Space can reuse the Rust explorer over reviewed public artifacts without placing owner controls or experiment credentials on Hugging Face.
