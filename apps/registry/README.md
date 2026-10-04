# Identity Dissolution Research Registry

Cloudflare implementation of a recorded behavioral research study. Public evidence pages and private owner/rater controls; separate web and queued inference Workers; D1 metadata and R2 raw evidence.

## Run and validate

```sh
npm ci
npm test
npm run typecheck
node scripts/secrets.mjs --rotate
npx wrangler d1 migrations apply identity-research-registry --local
npm run dev
```

In another terminal run `node scripts/api-check.mjs`. It creates explicitly labeled local test records only. No model inference is performed by these checks. Read `.dev.vars` locally for the owner token; never share that file or put its contents in logs. The console exchanges the token for an HttpOnly, Secure, SameSite=Strict eight-hour cookie. Raters have separate opaque tokens. Production secrets are set by `node scripts/secrets.mjs --deploy` over stdin.

## Production resources

- Web/API Worker: `identity-research-web`
- Consumer Worker (no public route): `identity-research-runner`
- D1 database: `identity-research-registry`
- R2 bucket: `identity-research-evidence`
- Queue: `identity-research-jobs`
- AI Gateway configured ID: `identity-research` (must exist in the same account)
- Custom domain: `research.mazzeleczzare.com`

After gateway creation, migrations, and secret setup:

```sh
npx wrangler d1 migrations apply identity-research-registry --remote
node scripts/secrets.mjs --deploy
npx wrangler deploy --config wrangler.runner.jsonc
npx wrangler deploy --config wrangler.jsonc
```

The custom domain is added explicitly; do not remove an unrelated wildcard domain. Preserve the original Sites publication as a historical workbench.

## Study lifecycle

1. Sign in at `/console.html`, select and review a pilot or technical smoke template.
2. Freeze the complete protocol. Changing it requires a new study with an amendment link.
3. Launch the frozen plan. Review the displayed upper token budget; gateway calls can incur charges. No automatic inference fallback is configured. Requests bypass cache.
4. Inspect every result, failure, cutoff flag, and raw artifact. Unknown termination metadata stays unknown. Three recovery tasks independently branch from turn 2.
5. Create one rater account for solo work; add collaborators when available and share their tokens privately. Assign completed outputs. New releases record contributing account counts, which do not establish human independence. A solo score cannot establish inter-rater agreement. Repeated annotation rounds are not yet supported; do not use a second account to imply a second person. Calibrate on separate examples. Rater submissions and later adjudications remain distinct.
6. Review the complete study and explicitly publish a frozen release. Draft data is not exposed publicly.
7. Download the release bundle and run `python3 analysis.py RELEASE.json` using the script at `/analysis.py`. The script verifies the repeated-four-gram metric against raw response content and calculates descriptive matched factorial differences.

## Limits and interpretation

The pilot uses fixed authored prompt variants and a small seed sample. It is not powered confirmatory research. The first-party freeze is not an external preregistration. Raw artifacts have content hashes and server timestamps, but are not independently notarized. Storage is application-level append-only, not a legal retention lock: Cloudflare account administrators can alter infrastructure. Hosted model aliases do not expose a pinned weights digest or hardware provenance. Requested seeds are not a determinism guarantee.

Release generation checks artifact checksums and caps collected raw evidence at 16 MB. Larger studies need an offline archive export. Stable release URLs and citation text are provided; DOI deposit, independent archival preservation, human ratings, and a powered confirmatory study require actual additional work, not fabricated metadata.

Model allowlists are in `wrangler.jsonc`; currently only the validated default model is permitted. Queue delivery may repeat, but an atomic D1 claim prevents repeated inference for the same run. A crashed consumer is marked interrupted after twenty minutes. It is never silently retried as a fresh observation.

The `/method.html` page contains the full current methodological scope and research references. Original historical source material remains in the separate original research bundle, not in this public registry.

## Research hub and Persona studio

The hub is `/`; the original lab is `/studies/identity-dissolution`. Legacy control and release URLs remain supported. `/studies/persona-integrity` explains the separate frozen categorical rubric, with owner-only `/persona.html` as its local reading instrument.

Generate `packet.json` with `studies/persona-integrity/scripts/import_registry.mjs` and a separately retrieved release checksum. Load that packet in the studio, enter a stable annotator ID, read each response/context, and record labels with exact evidence excerpts. Prepare the export, download or copy the JSON, and confirm the saved file. The tab does not upload transcripts or persist them in browser storage. Closing without export loses work. Exports retain packet hash, source release, technical eligibility, uncertainty, and the fact that original evidence was not reverified by the browser adapter. Journals remain private local files; publication and repeated annotation rounds require later dedicated workflows.
