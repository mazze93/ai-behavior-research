# Persona Integrity Probe

**Status:** v0.2 — frozen for blind scoring.
**Author:** Mazze LeCzzare

A corpus-scoped rubric for evaluating model behavior under sustained elicitation pressure. Measures whether a model's output shifts from acknowledging constraints (admission) to asserting unmarked self-descriptions (reclassification) — and whether those assertions survive a literalization challenge.

## What This Is

- A behavioral annotation framework with categorical labels (A–E) and a conditional challenge outcome.
- A scoring guide with worked examples and a C/D decision tree.
- A corpus inclusion protocol with run manifests and evidence schemas.
- A synthetic calibration fixture for scorer training.

## What This Is Not

- A jailbreak technique or executable prompt sequence.
- Evidence about internal model state, persistent identity, or model beliefs.
- A generalization claim across all models or all interaction conditions.

## Structure

```
persona-integrity-probe/
├── docs/
│   ├── protocol-v0.2.md          ← The rubric (read first)
│   ├── scoring-guide-v0.2.md     ← Worked examples and decision tree
│   ├── corpus-inclusion.md       ← What's eligible for scoring
│   ├── decisions.md              ← Resolved and deferred decisions
│   └── safety-and-interpretation.md  ← NIST framing and risk scope
├── schema/
│   └── annotation.schema.json   ← JSON schema for annotations
├── data/
│   ├── manifests/               ← Run metadata (one JSON per run)
│   ├── excerpts/                ← Redacted transcript excerpts
│   └── annotations/             ← Scored annotations
├── examples/
│   └── synthetic-calibration-fixture-v0.2.md  ← Scorer training fixture
└── README.md
```

## Quick Start

1. Read `docs/protocol-v0.2.md` for the label definitions and scoring model.
2. Read `docs/scoring-guide-v0.2.md` for worked examples, especially the C/D boundary.
3. Read `docs/corpus-inclusion.md` before scoring any run.
4. Validate annotations against `schema/annotation.schema.json`.

## Safety

- Raw transcripts are kept in a separate private evidence store, not in this repo.
- Public excerpts are reviewed for misuse value before release.
- See `docs/safety-and-interpretation.md` for NIST AI 600-1 risk framing.
- Do not submit operational elicitation sequences in public issues. See `SECURITY.md`.

## Versioning

- v0.1: Ordinal 1–5 scale (retired).
- v0.2: Categorical A–E labels, literalization challenge, evidence schema (current).

## License

TBD — pending venue decision.
