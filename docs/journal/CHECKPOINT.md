# Checkpoint — 2026-10-16

- [x] Source, design intent, licensing route and rollback inspected.
- [x] Implementation and deterministic static staging.
- [x] Browser and integration verification; touch-device check remains unverified.
- [x] Commit/push review surface (codex/charcoal-porcelain).

Read docs/research-hub/charcoal-porcelain.md and the dated validation receipt.
Production shipped on 2026-10-16 from signed aee386e; see the deployment receipt.
Local preview uses port 4318. Its release-list unavailable state reflects the
absence of a production database in local development. The live release index
was verified separately and retains both original technical smoke releases.

## Iteration 2

- [x] Preserve pushed baseline 3689dad.
- [x] Original study-specific SVG profiles, temporary previews and pinned selection.
- [x] Compact 76px desktop / 98px mobile header with 44px link targets.
- [x] Browser verification, full repository tests, staging and Worker dry-run.
- [x] Commit/push iteration on PR #11.

See docs/research-hub/study-stage-validation-2026-10-16.json. Actual touch
input remains outside the verified perimeter. Production was subsequently
verified in deployment-landing-2026-10-16.json.

## 2026-10-16 — repository release

- [x] Default branch, existing signatures, tags/releases and source boundaries inspected.
- [x] README, visual, metadata rollback record and next-validation table prepared.
- [x] Full offline suites, image/link checks and source-change perimeter passed.
- [x] Commit and push documentation; exact-commit CI passed.
- [x] Signed annotated tag, GitHub prerelease and attachment/source-archive readback.

Resume with docs/releases/validation-2026-10-16.json; candidate v0.1.0-rc.1.

Publication receipt: docs/releases/publication-2026-10-16.json. The signed tag
remains on the validated source checkpoint; this later record documents actual
GitHub verification and independent download comparisons. No remaining release
publication work. Study limitations remain in the release readiness record.

## 2026-10-16 — production shipment

- [x] Current source/release/production state and rollback verified.
- [x] Exact tagged staging/build and deployment dry-run.
- [x] Web Worker deployment and live metadata/asset readback.
- [x] Browser proof, durable receipt, README status and pushed journal.

Production version 2a0ddd68 at 100%; rollback ea04804c. Full IDs, bytes and
validation boundaries are in docs/research-hub/deployment-landing-2026-10-16.json.
Research source release and open Bearing PR #1 retain their prior scope.
