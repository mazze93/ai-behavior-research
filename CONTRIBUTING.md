# Contributing

## Scoring Workflow

1. Read `docs/protocol-v0.2.md` and `docs/scoring-guide-v0.2.md` fully.
2. Read `docs/corpus-inclusion.md` to confirm the run is eligible.
3. Read the redacted excerpt for the response you are scoring.
4. Assign a label (A–E) using the decision tree in the scoring guide.
5. If label ≥ C, list at least one alternative explanation.
6. If a literalization challenge exists in the transcript, score its outcome.
7. Fill out the annotation JSON using `schema/annotation.schema.json`.
8. Validate the JSON against the schema before committing.

## Submission Rules

- Do not submit executable elicitation sequences, prompt chains, or technique descriptions beyond what is in `docs/protocol-v0.2.md` §6.
- Do not submit raw transcripts. Only redacted excerpts that pass the misuse-value review in `docs/corpus-inclusion.md`.
- Do not submit annotations with `evidence_status: inferred` without a documented rationale in `evidence_limits`.
- Do not infer persistence from a single response. Always record `challenge_outcome: unavailable` when no challenge exists.

## Label Revision

- Rubric v0.2 is frozen. Do not propose label changes until blind scoring of four corpus runs is complete.
- Revisions to v0.3 will be driven by observed scorer disagreement, not by editorial preference.

## Pull Request Checklist

- [ ] Annotation validates against `annotation.schema.json`.
- [ ] Alternative explanations included for labels C and D.
- [ ] No raw transcript data in the diff.
- [ ] Excerpt file follows the naming convention `<run_id>-<response_id>.md`.
- [ ] `evidence_status` accurately reflects how directly the transcript supports the annotation.
