# Cloudflare research registry integration

The [research registry](https://research.mazzeleczzare.com) supplies frozen experimental protocols, raw generation artifacts, failures and citable snapshots. Persona Integrity Probe supplies the independent human annotation rubric. Its v0.2 protocol and schema remain unchanged.

## Import a release

Requires Node.js 22 or newer; no package installation, Cloudflare token or GitHub token is needed. Download a bundle through its release page. Obtain the corresponding SHA-256 from `/api/releases`, separately from the bundle file, then run:

```sh
node scripts/import_registry.mjs /path/to/release.json EXPECTED_SHA256
node --test tests/registry.test.mjs
```

The importer verifies the complete downloaded file, frozen protocol and every embedded artifact. It refuses duplicate identifiers, missing pairs, inconsistent model/protocol references and failed responses in completed runs. All failures and exclusions remain in an inventory; only complete, non-excluded runs receive scoring packets. Re-importing the same release refuses to overwrite prior work.

Raw source and derived packets go exclusively to ignored `data/private/registry/<release_id>/`, with restrictive file permissions. Do not commit that directory. `transcript_integrity.source_hash` hashes the canonical `responses` array in the packet; the original release hash is retained separately. Matching hashes establish consistency, not independent notarization or proof that the originating server was truthful.

## Scoring and interpretation

Each packet contains individual response IDs, preceding context, request/response hashes and gateway log IDs. The three recovery responses branch independently from turn 2; they are not one sequential conversation. No response label, confidence or human rating is generated automatically. Registry surface metrics and its existing three annotation axes are not equivalent to A–E and are not translated.

The current registry protocol contains arithmetic, extraction and formatting recovery probes, not literalization challenges. Imported responses have `literalization_challenge: unavailable` and `challenge_outcome: unavailable`; they cannot support E. A future challenge-capable protocol needs an explicit versioned adapter and actual challenge-response evidence.

Use the frozen scoring guide to create human annotations. Validate them with the existing JSON schema and additionally call the exported `validateScoring(annotation, response)` helper to enforce the existing C/D alternative-explanation and unavailable-challenge rules. Packets are private context-review material, **not blinded assignments**: model and condition information is visible. Before blind scoring, a coordinator must create reviewed excerpts and independent assignments without revealing model identity or condition.

The original rubric is corpus-scoped to Gemini, Grok and Mistral. Cloudflare Llama observations are an exploratory extension, not evidence of cross-family calibration. Smoke studies are marked `technical-only` and do not count toward the four real corpus runs required before rubric revision. Other runs still need human inclusion review; successful transport is not eligibility.

## Publication boundary

This adapter imports only. It does not upload transcripts, publish annotations, grant a new reuse license, or modify the live registry. Repository membership does not authorize publication of its private corpus. The registry's full-bundle public release mechanism is appropriate for its already reviewed technical fixtures; do not use it for private persona corpus records without a separate reviewed-excerpt publication path.

For reproducibility, record the repository commit used for human scoring alongside each annotation submission. Archive source release IDs and hashes with the results. Human scoring, inter-rater agreement, external preregistration and archival deposit remain distinct research steps.
