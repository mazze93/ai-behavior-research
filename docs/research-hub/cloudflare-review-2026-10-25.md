# Research domain and gateway review — 25 October 2026

Read-only dashboard inspection confirmed the existing custom domain `research.mazzeleczzare.com` on `identity-research-web`. The active version before this release is `ccc9e98b-5182-4fbb-bf8b-2a54d48edfff`, at 100% traffic. The account and both research Workers match the checked-in configuration. The web Worker retains D1, R2, queue, assets and version bindings, logging, and its scheduled dispatch trigger. Dashboard metrics at inspection showed 302 invocations, 1 ms CPU and zero errors in the last 24 hours; these are a dated observation, not an availability guarantee.

## Gateway correction applied

The existing `identity-research` gateway was inspected through the authenticated dashboard. Authentication is enabled, response caching is disabled, and the fixed request limit is 50 per minute. Log collection is enabled, log classification disabled, with oldest-log deletion at 100,000 entries. These settings were preserved.

The gateway's default automatic retry setting was enabled for three retries with exponential backoff. It was disabled and read back as off. The existing runner already specifies `skipCache: true` and `retries: {maxAttempts: 1}`; changing the gateway default aligns future clients with that single-attempt intent. No inference request was made. Recovery, if intentionally required for a different workload: re-enable Retry Requests in this gateway's settings with the previously recorded three retries / one-second exponential backoff. Do not enable retries for research collection without recording the resulting observation policy.

## Version-controlled monitoring improvement

The web Worker configuration now enables `observability.issues.enabled`, retaining existing logs. This groups production errors without adding an application dependency. The dashboard initially offered “Enable issue detection”, confirming it was absent. This change takes effect on the next successful deployment; source configuration alone is not live verification. Cloudflare describes Issues as free during open beta: https://developers.cloudflare.com/workers/observability/issues/. Pricing may change after beta.

## Build gap resolved locally

Main contains typography and dependency updates newer than production. The previous generated explorer gallery failed the current builder fingerprint guard. Both selected public release bundles were downloaded with ordinary curl and checked against the versioned SHA-256 selection. The Rust renderer was rebuilt with the current lockfile; the gallery was rebuilt into a new directory. The previous gallery was preserved outside the repository. All 13 generated assets pass the guard. No new evidence or private source material was exported.

## Limits and next concrete checks

- The custom domain already exists; duplicating its DNS or Worker route is unnecessary.
- `run_worker_first: true` is retained because the Worker enforces authentication and headers. Serving assets directly would skip these controls.
- No account-wide security, Access policy, DNS, billing, provider credentials or gateway log processing was changed.
- No public agent execution endpoint was enabled. `llms.txt` describes public reading and citation boundaries.
- The application login endpoint has no application-level rate limiter. Gateway inference throttling does not protect login. Adding a dedicated Worker rate-limit binding is a separate security change requiring local denial/allow tests and live verification; this review does not claim login throttling exists.
- Authenticated Persona file selection remains a separate end-to-end validation boundary; no new claim of its completion is made here.

Official references checked: https://developers.cloudflare.com/workers/wrangler/configuration/ and https://developers.cloudflare.com/workers/observability/issues/. Release and browser receipts will record the actual deployed version separately.

## Dependency corrections

Fresh full audits (including development tools) identified `fast-uri` 3.1.8 beneath the landing language server and `undici` 7.29.1 beneath Miniflare. The initial production-only registry audit had zero findings because these are development dependencies; it did not cover this tooling graph.

The landing lockfile now selects `fast-uri` 3.1.9 without changing its parent ranges. The registry pins an override of Undici 7.30.1, the same-major security patch, while retaining Wrangler 4.151.2. Miniflare pins the older exact version, so an ordinary transitive update cannot select the patch. Revisit the override when Miniflare adopts a fixed release. Installation used the public npm registry, lockfile integrity checks and disabled install scripts. This is dependency remediation, not evidence of an exploited production vulnerability.

Maintainer advisories: https://github.com/fastify/fast-uri/security/advisories/GHSA-w74x-v6f9-j3xg and https://github.com/nodejs/undici/security/advisories/GHSA-4qv8-2p9j-2685. The audit also associates Undici's patched range with subresource integrity and excessive content-encoding advisories. Fresh post-patch audit and Wrangler compatibility checks are recorded in the release receipt.
