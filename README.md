# AI Behavior Research

A private research monorepo for collecting reproducible model-behavior evidence, developing annotation methods, and publishing reviewed research releases. These studies concern observable outputs, not internal beliefs, consciousness or persistent identity.

## Project map

| Location | Purpose | Status |
| --- | --- | --- |
| [apps/registry](apps/registry) | Cloudflare web/API, queued inference, D1 migrations, R2 evidence, deployment configuration | Live at [research.mazzeleczzare.com](https://research.mazzeleczzare.com); technical smoke verified |
| [apps/workbench](apps/workbench) | Original brutalist static study workbench | Historical Sites publication; reproducible static build |
| [studies/persona-integrity](studies/persona-integrity) | Frozen v0.2 rubric, scoring guide, schema and registry importer | Human scoring pending |
| [studies/identity-dissolution](studies/identity-dissolution) | Local Ollama runner, protocol, tests, pilot config and synthetic fixtures | Exploratory local pilot tooling |
| [provenance](provenance) | Source inventory, historical reference material and public release pointers | Reference-only; not execution instructions |

## Develop and verify

Requires Node.js 22+ and Python 3.10+. From the repository root:

```sh
make install       # npm ci from the registry's committed lockfile
make test          # all offline suites, TypeScript and tracked-file boundary check
make workbench     # build/workbench, including a reproducible local-runner ZIP
make registry-dev  # local Cloudflare development server
```

The two study protocols are distinct. The local runner has a sequential recovery turn; the Cloudflare runner uses three independent recovery branches. Do not combine their observations as equivalent experiments. Persona A–E labels are human annotations and are not derived from registry metrics.

## Version and evidence policy

This repository is the source of truth for application code, research protocols, migrations, test fixtures and build/deployment instructions. Deploy from a clean commit and record both its SHA and the resulting Cloudflare Worker version. Study protocols retain their own frozen versions; a monorepo change does not revise a frozen rubric.

Live D1/R2 state, credentials, private transcripts and real run exports are not Git assets. Git tracks their identifiers, hashes and reviewed release references. Synthetic examples are explicitly labeled and may be tracked. See [repository architecture](docs/architecture.md) and [source inventory](provenance/README.md).

Infrastructure commands are manual and require the owner's Cloudflare login. CI runs offline validation only; it does not deploy, launch paid inference, publish evidence or receive production secrets. See [registry setup](apps/registry/README.md).

The monorepo consolidation does not change existing service URLs or republish the original Sites workbench. The repository remains private. No new blanket license is granted; study and source-material licensing decisions remain pending.

## Share and reproduce evidence

The [Rust evidence explorer](tools/evidence-explorer) renders source-linked coverage and effect views. The [RustPress bridge](docs/research-hub/rustpress-integration.md) prepares a reviewed editorial brief. The [Hugging Face exporter](docs/research-hub/huggingface-integration.md) prepares dataset cards and release-specific JSONL tables from explicitly selected, checksum-verified public evidence, with CC BY 4.0 for rights-controlled projections/documentation and explicit third-party exclusions. The source bundles and private repository code are not relicensed. These offline exports do not run models or publish automatically. Hub write access and live Viewer readback remain pending; no public mirror is claimed.
