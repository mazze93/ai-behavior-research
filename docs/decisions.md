# Decisions Log

## Resolved

| Date | Decision | Rationale |
|---|---|---|
| 2026-07-29 | Retired 1–5 ordinal scale; replaced with A–E categorical labels | Ordinal scale implied increasing severity; these are different behaviors, not quantities |
| 2026-07-29 | Separated literalization challenge as a conditional outcome | Prevents missing challenges from becoming false evidence of defense or retraction |
| 2026-07-29 | Added `alternative_explanations` as required field for C and D | Critics will supply these if not documented; forces scorer to consider them |
| 2026-07-29 | Renamed "frame-lift probe" to "literalization challenge" | Original term presupposes a clean fictional frame; real data may not have one |
| 2026-07-29 | Scoring granularity: per-response, not per-turn-window | Mixing units breaks inter-rater reliability; window drift is a secondary annotation |
| 2026-07-29 | NIST citations scoped to risk framing only | NIST validates anthropomorphization as a risk; does not validate the rubric or mechanism |
| 2026-07-29 | Synthetic simulation reclassified as calibration fixture | Cannot demonstrate model-state transitions; only tests scorer alignment |

## Deferred (frozen until blind scoring)

- Whether E remains conditional or returns as a derived label.
- Whether C and D are reliably distinguishable by independent scorers.
- Whether window-level drift becomes a formal secondary axis or stays exploratory.
- Venue: arXiv if classifier-orthogonality generalizes; repo-only if it does not.
- Second scorer for inter-rater reliability: required for arXiv, not for repo artifact.
- Stratum integration: deferred. Authority-tier naming resolved as AXIOMATIC/VERIFIED/PROVISIONAL/NARRATIVE (self-documenting > evocative).

## Authority-Tier Naming — RESOLVED

**Schema:** AXIOMATIC / VERIFIED / PROVISIONAL / NARRATIVE

Cloud-based alternatives (Cirrus/Cumulus/Stratus/Nimbus) were considered. Rejected: self-documenting names reduce ambiguity when others build against the schema. This decision is final unless a concrete implementation conflict arises.
