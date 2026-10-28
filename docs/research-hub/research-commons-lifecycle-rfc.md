# RFC: Research Commons — reusable research lifecycle

Status: **Proposed / not implemented**  
Owner: Mazze LeCzzare Frazer  
Scope: `research.mazzeleczzare.com` and `ai-behavior-research`  
Decision: **Open**. No change to existing frozen protocols, deployed Workers, evidence, or publication policy.

## Purpose

Turn the existing public research index and specialized instruments into an accessible, modular environment where people outside the author's projects can **design, conduct, analyze, visualize, submit, review, and publish** defensible research.

The public homepage currently offers three study briefs (Identity Dissolution, Persona Integrity, Authority Without Assertion) and one tool (Bearing). This is useful as a reference catalogue, but it does not constitute a self-service research lifecycle. The first vertical slice must allow a third-party researcher to reproduce a **synthetic**, bounded example from design through a reviewable publication package without owner intervention. No simulated data may be mistaken for empirical findings.

This RFC extends, rather than supersedes, `docs/research-hub/design.md` and `docs/research-hub/visual-community-lab.md`.

## Outcomes and non-goals

**Outcomes**
1. A newcomer can select a validated design template, understand its assumptions, fork it, and save a versioned research project.
2. A study-specific adapter can execute or import a bounded observation set; failures, exclusions, budgets, and missing observations remain explicit.
3. Deterministic analysis operates over verified source-linked inputs. Visualization has an accessible data table and raw-record drill-down.
4. A researcher can assemble and submit a claim-to-evidence package for human review, publish only after explicit approval, and later issue corrections without overwriting prior releases.
5. Methods, accessibility, privacy, permissions, and attribution are inspectable before a researcher performs a consequential action.

**Non-goals for the first slice**
- A generic protocol form claiming to cover every scientific discipline.
- Running live human-participant, security-target, or paid model experiments by default.
- Automated peer review, DOI issuance, third-party notarization, scientific truth scoring, or automatic public publication.
- Treating agent/model annotations as independent human ratings.
- Publishing private corpora, credentials, or raw Context Synapse telemetry.
- Moving existing deployments or freezing new versions of existing studies incidentally.

## Distinct contracts

**Research object** (an organizing entity, not one mutable blob): stable project identifier; owner/actor identity; privacy and consent classification; title/abstract; discipline/module identifier; relationship to a parent or fork; versioned references to protocol, executions, analyses, submissions, and releases.

**Protocol version**: objectives and questions; hypotheses/estimands where applicable; outcomes; sampling unit; conditions/assignment or coding method; controls; stopping rules; exclusion rules; permissible analysis; ethics/privacy requirements; frozen timestamp and checksum. A change after registration creates an amendment, never rewrites the registered version.

**Execution/import**: module adapter and version; actor kind (human, model, agent, system); explicit scope/budget/permissions; frozen protocol reference; raw inputs/outputs and immutable artifact references; execution events; failure and interruption records. Adapters must declare supported modalities and their limits.

**Observation and evidence**: typed records with origin, capture context, timestamps where relevant, provenance chain, source hashes, privacy classification, and state (recorded, missing, excluded, failed, budget-limited). A hash attests to bytes, not truth. Unknown provenance is representable, not silently upgraded.

**Analysis specification**: pinned inputs, versioned code/specification, assumptions, denominators, missingness and exclusions, uncertainty method, sensitivity checks, outputs, and reproducibility status. Reject incompatible data/analysis pairings rather than coercing heterogeneous studies into a universal metric.

**Claim**: exact wording, claim category (descriptive, exploratory, confirmatory, interpretive), supporting and countervailing evidence, known limitations, author, and explicit review status. Unsupported claims remain recordable as proposals, never as validated findings.

**Publication package**: immutable reviewed snapshot linking the approved claim set, frozen protocol and amendments, evidence/analysis manifests, accessible figures/tables, reproducibility instructions, privacy/licensing review, contributor roles, and prior-version links. External deposit identifiers only after verified readback.

These contracts should be implemented as typed schemas and tested state transitions **incrementally**, with an ADR covering storage choices before production migrations. Existing registry artifacts remain authoritative within their current published scope.

## Two orthogonal states

1. **Capability maturity**: proposed -> source-inspected -> implemented -> locally tested -> production-verified; each with evidence, deployment version, and applicable permissions.
2. **Research evidence status**: design draft -> registered protocol -> technical smoke -> pilot/exploratory evidence -> reviewed analysis -> published claim -> replicated/corrected (where applicable).

The second is **not** a single automatic ascending ladder: exploratory work need not become confirmatory, a review is not independent replication, and correction is not failure. Research stages and publication states should be separate enumerations in the implementation. Display capabilities and evidence statuses independently in the UI.

## Publication and authority boundaries

- Anonymous: browse public designs, public releases, methods, data tables, and permissible reproducibility artifacts.
- Authenticated contributor: create private projects, fork templates, propose changes/annotations, and assemble submissions within project scope.
- Executor: run only allowed adapters within a declared budget and approved scope; inference and external calls require explicit consent.
- Reviewer: inspect source-linked evidence, raise counterclaims, request changes, record conflicts of interest and approve/reject within authorized scope.
- Publisher: explicitly ratify a reviewed public release after privacy, consent, license, and claim/evidence checks. No background publish.
- Agent/model: read/inspect/propose by default; no implicit permission to execute, mark human agreement, or publish.
- A participant-consent or ethics-approval gate cannot be satisfied solely by a checkbox when independent institutional or legal review is necessary.

Privilege checks must be enforced by the server/API, not by route hiding, robots instructions, or UI labels. Audit records distinguish user intent, proposed action, authorization decision, and executed effect.

## Reference module strategy

**Identity Dissolution** validates factorial execution, bounded provider calls, planned/actual matrices, recovery, failures, and analysis denominators. Public smoke releases remain technical-only.

**Persona Integrity** validates human reading in context, categorical rubrics, stable annotator identity, alternatives, adjudication, and later within-rater rounds. A–D registry scoring must not silently claim support for E; independent agreement requires independent contributors.

**Authority Without Assertion** is a protocol-in-development entry; it must not present a runnable hosted experiment until frozen and verified.

**Bearing** is a developing claim-dependency tool; its graph operations cannot become a truth score or independent certification.

These are compatibility fixtures for the Commons contract, not templates to copy without their method-specific limitations.

## Accessible and inspectable visual models

- WCAG 2.2 AA target for navigation, forms, visualizations, errors, and focus behavior; verification includes keyboard-only, screen-reader, reduced motion and narrow-view flows.
- Every graph and chart has a text summary, exact-value table, clear units/denominators and a way to inspect source records.
- Missing, zero, censored, excluded, and budget-limited are visually and semantically distinct.
- Exported visuals pin source/analysis hashes and selection state; color is never the sole carrier of meaning.
- Deterministic computation/rendering must not consume language-model tokens.

## First end-to-end slice — no inference spending

**Scenario:** A new researcher chooses a synthetic factorial template, forks it, edits a draft question, registers the version, imports a validated synthetic fixture, runs a deterministic analysis, explores an accessible matrix, assembles a private submission, and obtains an explicitly labeled *demonstration package*. This does not enter the public findings registry.

Deliver in small reviewable increments:

1. **Read-only template manifest and study-module capability descriptor.** Reuse current catalogue without moving routes. Show explicit implementation/method status. Verify validation of malformed, incompatible and unpublished descriptors.
2. **Versioned private fork and registration.** New API contracts and authorization tests for ownership, collaborators, amend-after-freeze, and cross-tenant access. Include migration/rollback plan before changing D1.
3. **Synthetic import + reproducible analysis.** Use the existing Python verifier/Rust explorer where compatible. Validate source hashes, missing/excluded records, incompatibility rejection, and deterministic outputs. Avoid live inference.
4. **Submission package with review state.** Bind claim text to evidence/limits, require human review and explicit public-release approval; first slice stops at private demonstration, no real publication.
5. **Accessible independent-user test.** A non-owner completes the path without CLI or private project access. Collect task success, abandonment, errors, and comprehension of evidence status; fix blocking failures.

**Slice acceptance:** recorded end-to-end user path; passing permission/tenant-isolation and schema tests; hash and reproducibility readback; source-linked visualization plus accessible table; zero unintended provider calls, evidence publications, or unreviewed claims; documented deployment/rollback; a second reader correctly identifies the demonstration as synthetic.

## Evidence-based build gates

- Gate A: schemas, lifecycle invariants and failure cases reviewed, including module-specific non-applicability.
- Gate B: authorized private fork/registration works across two test identities; unauthorized reads/writes demonstrably denied.
- Gate C: import/analysis reproduces fixture results; tampering, unsupported methods and incomplete records fail transparently.
- Gate D: submission/readback works; public release requires a separately reviewed publication decision.
- Gate E: keyboard/screen-reader and novice task walkthrough passes; complete provenance and correction paths remain visible.

## Open decisions for owner

1. Is Commons public contribution self-sign-up, invitation-only initially, or a tiered trial?
2. Which publishing governance applies: owner editorial review first, or delegated study/project review boards?
3. Which research domains should the first *external* module serve after the synthetic factorial demonstration?
4. What are the initial privacy/retention and abuse-budget ceilings for untrusted accounts?

Until resolved, default to private/invited creation, owner-reviewed publication, no paid execution, and no public raw-private-data export.

## Implementation hygiene

Work on feature branches; keep this RFC separate from existing open PRs and from production code. No agents/fleets needed. Adopt exact, tested, permissioned routes; keep all previous evidence identifiers and deployed URLs unchanged. Only mark a gate complete after reproducible tests and live readback for changes that claim production readiness.
