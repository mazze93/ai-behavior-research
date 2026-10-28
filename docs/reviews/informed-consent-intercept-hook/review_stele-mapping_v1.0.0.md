---
title: "Informed-Consent Intercept Hook — review and Stele mapping"
version: 1.0.0
date: 2026-10-28
subject: "[spec v1.0.0](spec-v1.0.0.md)"
evidence: "[touchstone report](touchstone-report_v1.0.0.md)"
stele_ref: "mazze93/stele @ 3d3a959"
status: reviewer opinion — recommendations, not a build order
tags: [review, agent-containment, stele, integrity-state-machine, policy-enforcement-point]
links: "[[stele]] [[intentional-fragility]] [[stratum]] [[ai-behavior-research]]"
---

# Informed-Consent Intercept Hook — review and Stele mapping

## 1. Bottom line

The spec has the right instinct and the wrong mechanism. Its instinct —
*stopping under doubt is the highest-value action, and the boundary should
fail closed* — is the same thesis Stele already ships. Its mechanism asks the
agent to report its own doubt, judges every request in isolation, and puts the
"perimeter" somewhere the agent can simply route around. Each of those is a
problem Stele has already met and answered in an ADR.

My recommendation: **don't build v1.0 as written, and don't build a second
integrity system.** Rebuild §3 as the *policy enforcement point* Stele's
ADR-0005 already anticipates, driven by state the harness observes rather than
state the agent reports. Split §2 off as a separate, explicitly hypothetical
training-time research question; it does not belong in a deployable spec.

## 2. What the spec gets right

- **Abstention as success, not failure.** This is correct, and it is Stele's
  own language: "Stopping is not defeat. Stopping under suspected TOBIRA
  activation is the highest-value action available to you"
  (`stele/src/lib/compiler.ts:97-98`).
- **Enforcement at a boundary rather than inside the model.** Right direction.
  §1 correctly diagnoses that sandboxes fail where egress exists.
- **Fail-closed allowlist.** The one part of §3 that held under probing: an
  unknown host is refused.

## 3. Where it goes wrong — three structural errors

These are design errors, not bugs; fixing the code in §3 does not remove them.

### 3.1 The monitored party is its own sensor

`dissonanceScore` arrives in the agent's payload. The monitor therefore
measures what the agent chooses to send (touchstone rows 5 and 8). §2.1 makes
the same mistake in training: the reward is paid on entropy the policy
controls, and a toy policy learns to fake it 99.1% of the time (row 6).

Stele's ADR-0002 rejects even a *second* model as judge because "the judge
inherits the vulnerability it guards." The spec goes one step further than
what ADR-0002 rejects: the subject is its own judge.

### 3.2 It is binary and stateless

Every request is either forwarded or HARD_DROP, and the next request starts
clean. A refused agent retries with a lower number and passes (row 8). There
is no middle state, so every weak signal must be either ignored or fatal —
exactly the usability trap ADR-0001 names: "Low-confidence tripwires must map
to mild transitions … or the system becomes unusable."

### 3.3 It conflates a training intervention with a runtime control

§2 is a fine-tuning objective; §3 is a deployable Worker. The closing claim
("shifts permanently") borrows certainty from the deployable half to cover the
untestable half. Nothing in this repo — or in Stele — can run the §2
experiment, and the spec offers no eval that would show it worked.

A smaller framing note: "informed consent" names the wrong party. The consent
at stake belongs to the operators and owners of the systems an agent reaches,
not to the agent. "Consented zones" is fine; the product name invites the
reading that the agent is consenting to its own constraints.

## 4. How Stele maps the same ground

| Concern | Intercept Hook v1.0 | Stele | Source |
|---|---|---|---|
| The stop | `<DISENGAGE>` token, trained via reward | EPOCHÉ — absorbing state; the compiled egregore becomes *only* the suspension notice | `integrity.ts` (EPOCHÉ row), `compiler.ts:59-71, 179-182` |
| Who detects | The agent (self-reported score) | The harness: 13 deterministic TOBIRA tripwires, each with a fixed severity and audit code | `tripwires.ts`, ADR-0002 |
| Granularity | Pass / HARD_DROP | ZANSHIN → UNHEIMLICH → WABI → EPOCHÉ, with a per-state capability matrix (extraction, API calls, state writes, patch application) | `integrity.ts:7-48` |
| Memory | None; each request judged fresh | Monotonic latch; no de-escalation API; EPOCHÉ absorbing; tested | `integrity.ts:52`, ADR-0001, `__tests__/integrity.test.ts:7,23` |
| Unknown input | `NaN`/`undefined` compare false → forwarded | Unrecognized transition → `[SYS_ANOMALY] … failing closed`, EPOCHÉ | `security.ts:53` |
| Record | 403 JSON body, nothing stored | SHA-256 hash-chained audit trail; decision latched synchronously *before* the awaited write | `enforcement.ts:49, 78`, `audit.ts` |
| Matching discipline | Exact hostname | Detection runs on a Unicode fold so invisible characters can't split a keyword | ADR-0006, `fold.ts` |
| Recovery | Implicit — just send another request | Only by ending the session; "the friction is the security" | ADR-0001 |

Read across, every row where the hook failed under probing is a row Stele has a
written, tested answer for. The intercept hook re-derives Stele's problem
without inheriting its conclusions.

## 5. Where the spec reaches past Stele — and why that matters

Stele's honest weakness is the same place the spec is aiming:

- **Stele's capability matrix gates Stele's own actions**, not the governed
  session's. When EPOCHÉ is entered, the downstream Claude session is told to
  stop by its egregore — a prompt instruction ("Do not rationalize
  continuation"). Compliance is requested, not enforced.
- **Stele has not closed its own trust boundary.** ADR-0004 is "proposed —
  scoped, not built"; the API key still lives in the browser tier.
- **Neither system controls network egress.**

So the spec has correctly spotted the gap in the Stele-shaped approach: a
latched integrity state with nothing at the network layer that obeys it. Its
mechanism just doesn't close that gap. The two are complementary halves, and
ADR-0005 already names the joint: Stele as a *policy decision point* exposing
"its evaluation context as a JSON envelope to an external policy service."

## 6. Recommended v1.1 shape

1. **The harness decides; the edge enforces.** Stele (or whichever harness
   runs the agent) is the decision point. It emits a signed envelope —
   `{ sessionId, integrityState, firedTobiraIds, auditHead, issuedAt }` —
   signed with a key the agent never holds. The hook verifies it with
   `crypto.subtle.verify` and never reads an agent-supplied score.
2. **Latch at the edge too.** One Durable Object per session as the single
   writer (the pattern Stratum's `StratumLogDO` already uses). It stores the
   highest state seen and applies `max(stored, incoming)` — Stele's
   `escalate()`, enforced a second time where the network is.
3. **Map the four states to egress capabilities**, not to pass/fail:
   ZANSHIN → allowlist; UNHEIMLICH → allowlist, every call audited;
   WABI → read-only methods to allowlisted hosts, no writes; EPOCHÉ → deny
   all, absorbing for the session.
4. **Make the hook the only route out.** Default-deny egress at the sandbox
   network layer; without this, items 1–3 are advisory.
5. **Forward to the normalised `targetUrl`** — the same destination that was
   checked — and strip inbound credentials from forwarded headers.
6. **Detach §2.** Rewrite it as a hypothesis with an eval: reward abstention on
   tasks *externally labelled* impossible or environment-mismatched, use a
   large finite penalty, and measure the abstention-versus-capability
   trade-off. If it is ever run, it belongs in `studies/` with a protocol, not
   in a deployment spec.

## 7. Where I might be wrong

- I'm reading the agent as adversarial or at least optimising. If the spec
  only targets well-intentioned agents that report honestly, rows 4, 5 and 8
  matter less — but then the perimeter claim needs restating at that scope.
- The PDP/PEP split assumes a harness exists that can sign envelopes. Stele
  today is a browser artifact with an undeployed `stele-core`; ADR-0004/0005
  say that tier is not built yet. v1.1 has a dependency, not just a design.
  - *Correction, 2026-10-28:* `stele-core` **is** deployed (Stele #91,
    verified live; see [spec v1.1 §15](spec-v1.1.0.md#15-corrections)). The
    sentence above relied on ADR-0004's dated status without checking later
    history. The ADR-0004 model-key boundary was re-checked at the same time
    and is still open on `main` and in the live app bundle.
- The recommendation adds state (a Durable Object per session) to what was a
  stateless Worker. That is the point, but it is cost and operational surface.

## 8. Open questions for the owner

- Should the hook speak Stele's lexicon in its envelope and audit codes, or
  stay vocabulary-neutral so non-Stele harnesses can use it?
- Is the target agent class "honest but mistaken" or "optimising against the
  boundary"? The answer decides whether the signed-envelope work is required
  or merely good practice.
- Does §2 stay in this program at all? It is the one part nothing here can test.
