# Hosted-release analysis and publication package

Scope: hosted registry schema v2 only. Do not apply the older four-condition local protocol analysis to the hosted factorial design. Preserve the existing lightweight analysis.py; add a standalone dependency-free Python package builder for downloaded reviewed releases.

Verify a separately supplied whole-file SHA-256, frozen protocol hash, and embedded artifact hashes using registry-compatible canonical JSON. Reject duplicate artifact/run IDs, wrong study/job provenance and cached/unsuccessful completed responses. Recompute repetition/word counts and recovery equality from raw bodies. Report all planned/recorded statuses and excluded runs, not zeros for failed generations.

Pair each factor within model, seed, variant and the other factors. Report complete and missing blocks from the frozen plan. Report uncensored pairs separately. Estimate descriptive paired differences and equally weighted requested-seed means. A deterministic percentile bootstrap resamples seed means only, per model; require at least three contributing seeds and never report intervals for smoke releases. This is explicitly post-hoc exploratory analysis, with requested seed labels not proof of independent draws; authored variants remain fixed.

Export analysis.json, runs.csv, contrasts.csv, claims.csv, manuscript.md, protocol.json, citation.txt, source bundle and exact analysis script plus checksummed manifest. Refuse overwriting an existing destination. Claims distinguish technical evidence from pilot findings and leave causal/consciousness/generalization claims unsupported. No automatic public release or DOI deposit.

Tests: tampered inputs, metric reproduction, planned missingness, duplicate factor cells, missing/cached raw evidence, seeded bootstrap arithmetic/reproducibility, smoke suppression, export non-overwrite and manifest identity. Run against both live technical releases and keep them labeled technical-only. Rollback is a branch revert; no data migration.
