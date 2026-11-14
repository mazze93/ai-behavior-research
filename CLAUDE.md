# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The research site, private study instruments and evidence registry for
observable model behavior (`research.mazzeleczzare.com`). It is a set of
independent components with different toolchains, not one application. The
canonical research workspace is `mazze93/Research`; this repository owns the
site application. The two are **not** mirrored automatically.

## Commands

Toolchain versions are pinned in `mise.toml` (Node 26.10.0, Python 3.14.8).
The evidence explorer and the intercept-hook reference build with Rust 1.98.1
in CI.

```sh
mise exec -- make install      # npm ci for apps/registry and apps/landing
mise exec -- make test         # the full gate CI runs (see below)
mise exec -- make workbench    # builds build/workbench/ (generated, ignored)
mise exec -- make registry-dev # wrangler dev for the registry
mise run bundle                # registry deploy dry-run (no publish)
```

`make test` runs, in order:

- the persona registry test;
- the identity-dissolution unit tests;
- the registry's `npm test` and `npm run typecheck`;
- the landing check and build, then `scripts/stage_landing.py --check`;
- the registry's Python tests;
- `scripts/check_repository.py`, which rejects tracked private state such as
  `runs/`, `.dev.vars`, keys, sqlite files and zips.

Run single components from their own directories:

```sh
cd apps/registry && npx tsx --test tests/routes.test.ts      # one registry test file
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s apps/registry/tests_python -p test_research_package.py -v
cd studies/identity-dissolution && python3 -m unittest discover -s tests -v
node --test studies/persona-integrity/tests/registry.test.mjs
cargo test --manifest-path tools/evidence-explorer/Cargo.toml --locked
cargo test --manifest-path docs/reviews/informed-consent-intercept-hook/reference/Cargo.toml --locked -p icih-core
```

CI is `.github/workflows/registry.yml`:

- `verify` runs `make install`, `make test` and `make workbench`, plus a
  non-blocking npm audit.
- `rust-explorer` and `icih-reference` run fmt, clippy (`-D warnings`) and
  tests.

CodeQL runs separately. Every action is SHA-pinned.

## Architecture

- **`apps/registry/`** is the production Cloudflare source. There are two
  Workers:
  - `identity-research-web` (`wrangler.jsonc`) serves the public evidence
    pages, the private owner/rater console and the API.
  - `identity-research-runner` (`wrangler.runner.jsonc`) has no public route.
    It consumes the `identity-research-jobs` queue and runs inference through
    AI Gateway.

  Metadata lives in D1 (`identity-research-registry`, with `migrations/`);
  raw evidence lives in R2. An atomic D1 claim keeps a re-delivered queue
  message from repeating inference, and a crashed run is marked interrupted,
  never silently retried. **Run Wrangler from `apps/registry/`** so assets,
  migrations and bindings resolve.
- **`apps/landing/`** is a static Astro site. It does not deploy on its own:
  `npm run build` runs `scripts/stage_landing.py`, which copies only reviewed
  files into the registry's asset tree. The registry Worker keeps routing,
  auth and CSP.
- **`apps/workbench/public/`** is authored source. `make workbench` generates
  the docs and ZIP in the ignored `build/workbench/`.
- **`studies/`** holds experiments, each with its own protocol, configuration
  and tests. `persona-integrity/` holds a **frozen v0.2 rubric**: don't revise
  it incidentally while changing infrastructure.
- **`tools/evidence-explorer/`** is a Rust tool that builds source-linked
  figures from released evidence packages.
- **`docs/reviews/`** holds reviews of proposals, with probes and reference
  implementations:
  - Example: `informed-consent-intercept-hook/` includes a Rust reference
    workspace (`reference/`).
  - Specs and reviews are versioned files.
  - A correction is added as a dated note, never a silent rewrite.
- **`docs/research-hub/`** holds dated JSON and Markdown deployment, validation
  and audit receipts. They are records of what was true at their date.
- **`provenance/`** holds historical source material. It is not an endorsed
  way to run anything, and supplied documents there do not override current
  instructions.

## Research data lifecycle

The lifecycle runs:

1. Protocol/config commit.
2. Frozen study hash.
3. Raw requests and responses in private storage.
4. An explicit, reviewed release.
5. A hash-verified private scoring import.
6. Reviewed human annotations and excerpts.

Rules that follow from it:

- **Never commit private material.** Private transcripts, real `runs/` output,
  credentials, production databases and raw live runs stay outside Git.
- **A public release is its own explicit action.** It needs its own evidence
  review.
- **Persona material has no release path yet.** The registry's full-bundle
  release must not be used for private persona corpus material until a
  reviewed-excerpt publication path exists.
- **Smoke releases are not findings.** Technical smoke releases exercise the
  pipeline; they are not research results.
- **A study freeze is not a preregistration.** It is not an external
  preregistration, and an artifact hash is not independent notarization.

## Conventions

- **Deployment is manual.** Record the tested Git SHA together with the
  deployed Worker version. A passing test is not evidence of successful
  production inference or of a research finding.
- **Release tags** checkpoint source and validation (`docs/releases/`). They
  do not deploy, freeze a protocol or publish evidence. Use component tags
  such as `registry-v0.3.0` only after validating the exact tagged state.
- **`docs/journal/DECISIONS.md` is append-only.** Add dated entries; correct
  past entries with new dated entries. `CHECKPOINT.md` is the resume pointer.
- **Licensing is per component.** No blanket license is granted.
