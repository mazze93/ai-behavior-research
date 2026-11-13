# Research object contract

Version 0.1 · 2026-11-13 · status: draft, in use for three worked examples

A research object is the record of one investigation from its question to its
publication. It is the unit this site is organised around. A study page is a
view of a research object, not the object itself.

The contract is implemented as a pure checker in
[`apps/registry/src/research-object.ts`](../../apps/registry/src/research-object.ts)
and exercised by `apps/registry/tests/research-object.test.ts`, which runs in
`make test`. Nothing in the registry Worker enforces it yet.

## What a pass means

A passing object is internally consistent and claims no more than its own
stages support. That is all. The checker does not open the files an object
cites, does not verify a hash against bytes, and cannot tell whether the
research is right. A SHA-256 identifies bytes; it says nothing about truth.
The tests go one step further for the examples in this repository only: they
confirm each cited path exists and each stated hash matches.

## Stages

`question → hypothesis → protocol → execution → observation → analysis → claim → review → publication`

Each stage carries a status, and once it is recorded, a date and at least one
reference.

| Status | Meaning |
| --- | --- |
| `absent` | Nothing exists for this stage. |
| `draft` | Something exists but is not relied on. |
| `recorded` | A dated record exists and is cited. |
| `frozen` | Recorded, with a commitment not to change it. |
| `not-applicable` | This kind of investigation has no such stage. A reason is required. |

A stage can be recorded only when the stages it rests on are recorded, frozen
or declared not applicable:

| Stage | Rests on |
| --- | --- |
| hypothesis, protocol, claim | question |
| execution | protocol |
| observation | execution |
| analysis | observation |
| review | claim |
| publication | claim, review |

Claims rest on the question, not on execution. An argument built from cited
sources can make claims without running anything. The evidence grade below is
what stops that from being mistaken for an experimental result.

## Evidence grades

The grade describes executed evidence. An object states its grade, and the
checker computes the highest grade its stages can support. Stating a lower
grade than the ceiling is allowed, and is how a pipeline test stays labelled
as one. Stating a higher grade is a finding.

| Grade | The stages must show |
| --- | --- |
| `none` | Nothing executed. |
| `smoke` | Execution recorded. The run exercised the pipeline. |
| `pilot` | Execution recorded. |
| `exploratory` | Observation and analysis also recorded. |
| `confirmatory` | Hypothesis and protocol frozen on or before the day execution began. |
| `replicated` | Confirmatory, plus a recorded `independent-replication` event. |

`smoke` and `pilot` have the same ceiling. The difference is the author's
declaration of intent, which the checker cannot derive.

## Claims

A claim needs a statement, at least one evidence reference and at least one
stated limit. Counter-evidence is listed beside the evidence and is never
subtracted from it. Claims cannot be listed before the claim stage is recorded.

## Publication and external events

Publication is recorded only with a `publication_decision` of `publish` made
by a human author named on the object. The checker never infers it.

Peer review, a DOI, an outside reader and an independent replication are
`external_events`. Each needs a date, who performed it and where its record
is. The checker confirms the shape. It cannot confirm the event happened.

## References

| Kind | Locator | Hash |
| --- | --- | --- |
| `repo` | A path in this repository. | Optional. |
| `release` | A registry release id. | Required. |
| `url` | A public address. | Optional. |
| `private` | Where a non-public record is kept. | Optional. |

A `private` reference declares that a record exists somewhere a reader cannot
check. It is a disclosure, not evidence a reader can use.

## The three worked examples

| Object | Module | Stated grade | Ceiling | Furthest recorded stage |
| --- | --- | --- | --- | --- |
| [Identity Dissolution](examples/identity-dissolution.json) | factorial model experiment | smoke | exploratory | analysis |
| [Persona Integrity](examples/persona-integrity.json) | human annotation | none | none | protocol (frozen) |
| [The Intentional Fragility](examples/intentional-fragility.json) | claim graph | none | none | claim |

No object has a recorded review or publication. That is the current state of
the work, and the examples are meant to show it.

## Where the contract does not fit yet

These came out of mapping the three objects and are open design questions.

1. **Stage dates are often the date of a receipt, not of the event.** The
   Identity Dissolution execution date is when the releases were read back.
   The confirmatory rule compares dates, so an object seeking that grade needs
   event times from the registry's own event log, not from a document.
2. **A frozen protocol has no proof of when it was frozen.** The Persona date
   is a first commit. A commit date can be set by its author. The contract
   records the commitment and cannot attest it.
3. **Identity Dissolution has two protocols.** The local pilot and the
   registry's factorial template are different designs under one name. They
   should probably be two objects, one derived from the other.
4. **The claim graph has its own, richer ledger.** The book's `bearing` engine
   tracks frames, retraction, checks with outcomes and leave-one-out
   survival. The contract's flat list of claims with evidence and limits loses
   all of that. For now a claim-graph object cites an export; the contract
   should instead accept a `bearing` fold as the claim stage's record.
5. **Human annotation has stages of its own.** Rater assignment, independent
   annotation, adjudication and agreement all sit inside "observation" and
   "analysis" here. Persona Integrity will test whether that is enough when
   real scoring begins.
6. **Smoke and pilot differ only by declaration.** The registry protocol
   already carries a `phase` field with these values. The grade should be
   derived from it when an object is built from registry rows.

## What exists outside this contract

The registry already stores most of the execution half: protocol versions
with `parent_id` and `amendment`, runs with exclusion reasons, an append-only
event table, raters, assignments, annotations, adjudications and hashed
releases. The contract adds the stages around them and the rules that connect
them. Building an object from registry rows is not implemented.

## Changing this contract

Bump the version in `SCHEMA` and in this file together. Record the reason in
`docs/journal/DECISIONS.md`. Corrections to this document are added as dated
notes.
