# Deployment status — 2026-09-27

Live registry: https://research.mazzeleczzare.com

Web Worker version: `2bbd87f8-43c3-4402-a015-24c355a97858`.
Runner Worker version: `7ededb7f-9453-4a3e-af9c-74f13e994e26`.

D1 migrations 0001 and 0002 applied. R2 evidence bucket, queue, consumer, scheduled dispatch, custom domain and web authentication secrets deployed. Owner and session credentials were rotated before deployment. The owner credential is available locally in the ignored `.dev.vars` file; do not publish or copy it into logs.

Live HTTPS checks passed: homepage, health endpoint and public releases return 200; anonymous private-study requests return 401; authenticated private-study requests return 200. Two technical smoke records are published, including the initial model-deprecation failure.

Twelve automated tests and local API lifecycle checks passed. TypeScript validation passed. The runner integration test uses actual local D1 and R2 with mocked model inference; it is not evidence of production inference success.

## Gateway activated and live inference verified

The Cloudflare plugin confirmed the existing `identity-research` gateway directly. Authentication and log collection are enabled; cache TTL is zero. No Apple sign-in was needed. The Worker also requests cache bypass and one attempt per inference call.

The original model alias returned HTTP 410 (deprecated). That failure and its raw artifacts remain preserved in release `rel_4cf968d3-f45f-496e-8270-84ce6af56271`. Templates and the allowlist now use catalog-listed `@cf/meta/llama-3.1-8b-instruct-fp8`.

An explicitly linked protocol amendment completed five inference calls. All ten request/response artifacts passed SHA-256 checks. Cloudflare logs independently confirmed five successful uncached calls with matching study, run and turn metadata. All three recovery probes matched their expected output.

Successful smoke release: https://research.mazzeleczzare.com/releases/rel_eb5c703f-d012-4f4e-ab1d-cea28ba48642

Bundle SHA-256: `323076f506e34a9daa19f8525e463932a104d756765a666628130d05a352a50d`.

These records validate the technical pipeline only. A factorial pilot, human ratings, external preregistration and independent archival deposit remain future research work.
