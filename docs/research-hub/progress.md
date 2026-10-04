# Goal journal

## 2026-10-04 — Burst 1: source-grounded foundation

Previous goal state: first active-goal burst; earlier monorepo migration was completed historical work. This burst gathered new evidence and changed the module plan.

Read the repository, live public health/release metadata, selected corpus files and three Drive sources. Established a clean worktree after finding untracked duplicate copies in the previous checkout. Managed worktree creation could not resolve a repository from the chat directory; fallback used Git from the verified repository. No duplicate files were removed.

Confirmed solo-first preference. Identified the inappropriate two-rater API constraint; found observatory CLI placeholders and Context Synapse's signed local-only/aggregate-only constraints. Captured a separate civil-society proposal without treating it as an executed study. Baseline: 21 tests and TypeScript pass. Dependency audit reports a newly affected dev-tool chain; deployment requires tooling review.

Completion remains unproven for the full goal: modular hub, advanced analysis, publication preparation, new experiment adapters and live redesign are still outstanding. See design.md for the unchanged completion contract. Private research data was not exported and no inference, participant study or security test was launched.

## 2026-10-04 — Burst 2: solo annotation checkpoint

Implemented solo-first assignment with optional collaborators. Validate the full account selection before writes; preserve uniqueness, owner-only controls and append-only submissions. New releases include submitted account counts, overlap counts, and explicit unverified human independence. Updated annotation and methods copy; delayed rounds remain unsupported.

Verification: observed the new lifecycle fail on the old one-rater restriction, then pass after the implementation. Final `make test`: 5 importer, 4 Python and 18 registry test results (including lifecycle parent/subtests), TypeScript and tracked-file boundary check pass. JavaScript syntax and Python single-account zero-pair/null-agreement check pass. The lifecycle covers later collaborator submission and byte-for-byte preservation of the earlier solo release. An initial file-write command used the wrong working directory and wrote nothing; corrected the directory before proceeding.

Fresh read-only branch review: no blocking findings; approved for checkpoint commit/push. Deferred minor: display annotation_design directly on release pages (currently available in downloadable JSON). Ruling: historical corpus reproduction, full hub capabilities, browser accessibility and deployment readiness were outside this slice and remain explicit outstanding work, not inferred successes. No production deployment or database migration occurred. Next: dependency remediation before deployment, then module catalog/routing and study-specific interfaces.

## 2026-10-04 — Burst 3: tooling remediation

Verified npm metadata and Node compatibility before upgrading the project-local Wrangler from 4.141.0 to exactly 4.147.0. Registry tests (18 results) and TypeScript pass with the updated Miniflare dependency. npm audit now reports zero findings in apps/registry; this is not a claim about all repository dependencies or deployed exploitability. No remote resource changed.

## 2026-10-04 — Burst 4: distinct hub and Persona instrument

Built a public typographic research index, a dedicated Identity Dissolution route preserving the existing instrument, and a distinct Persona Integrity study page/private reading studio. Re-read the frozen v0.2 protocol, scoring guide, importer and annotation schema. The studio accepts importer packets locally, displays context, records A–D labels with typed fields and verbatim evidence, and exports a provenance-linked journal. It does not claim blind calibration, independent raters, original-release reverification or support for E. No raw private corpus was added to static assets.

Verification: tests first failed for absent studio APIs/routes, then passed. Final full suite: 5 importer + 4 Python + 22 registry results, plus TypeScript and repository boundary check. Both Worker dry runs pass. Browser verified owner login redirect, synthetic packet loading, recording/locking B, retained form values, inspectable JSON export, and explicit saved-file acknowledgement. The copied browser export was parsed and its packet hash independently recomputed. Direct blob download completion could not be confirmed in the in-app browser; the complete JSON copy fallback is verified. Hub and Persona rendered at desktop and mobile (375 CSS pixels), without horizontal overflow. This is not a complete accessibility audit.

Review corrections: retained technical-only eligibility in exported response_provenance and renamed scorable_responses; removed premature saved-state marking on download requests. Tests for export eligibility failed before correction and pass afterward. Actual Wrangler asset probes showed encoded studio URLs redirecting through the protected route; strengthened normalized-path gating and added regression tests. Browser form values now remain visible after recording. Full-goal corpus expansion, additional adapters, advanced analysis and publication preparation remain unfinished.

Deployment plan: only identity-research-web code/assets; no schema, bucket, queue or inference changes. Preserve current version as rollback target, compare deployed configuration and release checksums, deploy exact committed source and verify public routes/private denial. Rollbacks restore code, not connected data: https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/ .

Packaging correction: the first hub upload (2c960479-2c95-4e1e-9f99-f3e55ec9ca41) included a locally generated Python __pycache__ artifact. Git ignored it, but Wrangler assets did not. Added a root-asset allowlist in public/.assetsignore using the installed Wrangler's documented ignore parser; verify the cache URL returns 404 after redeploy. The bytecode represented the already-public analysis script, not private corpus content. Predeploy Python urllib verification failed with a host socket error; curl subsequently confirmed live health and fetched the release index. Do not claim that failed predeploy check passed.

Deployment verified: identity-research-web version 998eeeaf-434c-470a-8366-cc206d3ed3a4 from source 7f3cbc6. Public hub and both module pages return 200; studio and encoded variants return 303 to owner sign-in; anonymous private API returns 401; generated bytecode and .assetsignore URLs return 404. Live browser shows both existing releases. Both public bundle hashes match their previously recorded values. Rollback target remains 2bbd87f8-43c3-4402-a015-24c355a97858; no migrations or runner deployment. See deployment-2026-10-04.json for evidence and limits. The broader goal is active and incomplete.

## 2026-10-04 — Burst 5: verified analysis and manuscript package

Opened PR #2 for the pushed hub checkpoint, as requested. Re-read the hosted runner, core metrics and frozen Persona/local Identity materials; kept this analysis specific to hosted schema v2 rather than treating the older four-condition protocol as equivalent.

Added a dependency-free Python builder that verifies separately supplied bundle hashes, protocol/artifact hashes, raw prompts/history/settings/cache policy, and derived repetition, word count, recovery and cutoff metadata. It exports original evidence and exact script, run/contrast tables, a claim-to-evidence table, citation, manuscript preparation draft and checksum manifest. Missing and failed observations remain missing. Factorial contrasts are model-specific and paired within requested seed, variant and other factors. Deterministic seed-mean bootstrap intervals require three contributing seeds, remain post-hoc exploratory, and are suppressed for smoke releases. Publication and DOI deposition are not performed.

Final review corrections: recompute cutoff from raw finish/usage metadata rather than trusting stored flags; unwrap nested response envelopes consistently with the runner. Both reproductions failed before fixes and pass afterward. Added request drift tests that failed before validation was implemented. The analysis suite now has nine tests. Both downloaded public smoke bundles pass the final builder; regenerating from each package's copied script yields identical manifests. See analysis-validation-2026-10-04.json for script and release hashes. No private corpus files or generated bundles were committed.

Site integration and deployment of this tool remain pending. The broader completion contract is still incomplete: corpus reading, additional experimental adapters, repeated scoring rounds, reproducible figures and publication workflow require further work. No new inference, database migration or evidence publication occurred in this burst. Rollback for this checkpoint is a branch revert; stored evidence is unaffected.

Final full validation after review fixes: `make test` passed 5 importer + 4 local study + 22 registry + 9 analysis test results (40 total), TypeScript and the tracked-file boundary check. Staged diff whitespace check passed. This proves the tested tooling behavior, not completion of the research program or a comprehensive security audit.
