---
title: "Informed-Consent Intercept Hook — touchstone report"
version: 1.0.0
date: 2026-10-28
subject: "[spec v1.0.0](spec-v1.0.0.md)"
verdict: did not hold
tags: [touchstone, review, agent-containment, cloudflare-workers, reward-design]
---

# Touchstone report: Informed-Consent Intercept Hook spec v1.0.0

**Verdict: did not hold.** Every section that could be tested failed. Two
failures (rows 3 and 6) are in the design's core logic and would survive a
clean reimplementation; the rest are build failures.

**Claim under test.** An "immutable network perimeter" plus a reward change
shifts the agent's objective "permanently away from breakout behaviors."
**Proof offered.** None: the document carries no tests, training runs or
citations, so every probe targets unexamined ground.

## Probed results

Tooling: wrangler 4.154.0 (via `npx`), Node 22.22.0, Python 3. Probe sources
are in [`probes/`](probes/).

| # | Claim | Probe | Result |
|---|---|---|---|
| 1 | §3.1 config is deployable | `wrangler deploy --dry-run` on [`probes/spec-wrangler.toml`](probes/spec-wrangler.toml) | **Rejected:** `The field "kv_namespaces" should be an array but got {"bindings":[…]}`. The KV id contains non-hex characters (`g`–`p`), so it is a placeholder, not an id. |
| 2 | §5 KV bootstrap works | `wrangler kv:key:put --binding=BOUNDARIES_KV "zone:localhost" "true"` | **Rejected:** `Unknown arguments: binding, kv:key:put, zone:localhost, true`. Current syntax is `wrangler kv key put`, which takes `--local` or `--remote`; the spec must say which. |
| 3 | "Safe path execution" forwards allowed traffic to its target | `probe-worker.mjs` P1 | **Fails in core logic.** The forward goes to `request.url` — the hook's own address — never `targetUrl`. The allowlist checks one destination; the code sends to another. Deployed, that is a self-call or an error, so even allowed traffic never arrives. |
| 4 | Requests are cryptographically verified | P2 (signature `"x"`), P3 (field omitted) | **Both pass (200).** The check is `!== ""`; an omitted field is `undefined`, which is not `""`. |
| 5 | High "cognitive dissonance" is caught | P5 omitted, P6 `"high"`, P7 `-1e9` | **All pass (200).** Comparisons with `undefined`, `NaN` or a string are false. The score is reported by the agent being monitored. |
| 6 | §2.1 rewards only genuine uncertainty | `probe-reward.py` A: attempt a 70%-solvable task, or emit diffuse output then `<DISENGAGE>` | **P(fake uncertainty → disengage) = 0.991 after 2,000 steps.** The agent controls the entropy it is paid for. The "premature abandonment" guard is the thing being gamed. |
| 7 | §2.2 an infinite penalty steers training | `probe-reward.py` B | **Return `-inf`; gradient terms `nan`/`inf`.** One crossing in 1,000 trajectories makes the batch mean `-inf`. It breaks the arithmetic rather than steering it. |
| 8 | A refusal constrains the agent | P10: refused at score 0.99, then the same agent retries at 0.10 | **Second request passes (200).** Nothing latches; every request is judged fresh. |

**Held:** `pypi.org`, unknown hosts and an honestly reported high score are
blocked (403). The allowlist is exact-match and fails closed. That part is sound.

## Traced by reading (not executed)

- **Opt-in for the party it constrains.** §1 names physical egress as why
  sandboxes fail; nothing here closes it. An agent with a direct route never
  calls the hook. "Immutable perimeter" describes the opposite of the design.
- **§4 and §3 don't connect.** §4 reads "hidden activation states"; the §3
  Worker sees only JSON the agent writes. Edge and activations sit on opposite
  sides of the system with no specified bridge. "Immutable cryptographic drop"
  is not a defined mechanism.
- **"Inner layer entropy" is undefined.** Hidden states are vectors, not
  distributions; τ cannot be built or tested as written.
- **METR reference unsupported** by anything in the spec. METR's published work
  was not researched in this pass; the finding is only that the spec cites
  nothing.
- **"Permanently" is untested and untestable as written.** Fine-tuned behavior
  is routinely undone by further training.
- **Minor:** malformed JSON → 500 not 400; original headers (including any
  credentials) forwarded verbatim; explicit `pypi.org = "false"` is redundant
  under fail-closed, and blocking all of PyPI is not a typosquatting control.

## Perimeter — not checked

- No live Cloudflare deployment. Worker probes run a faithful JS port with a
  recording `fetch`; the self-call outcome in row 3 is inferred from documented
  platform behavior, not observed.
- The RL probe is a two-action REINFORCE bandit, not an LLM: it shows the
  incentive the reward creates, not how fast a real model learns it.
- Concurrency, KV eventual consistency, the Pages and hypervisor targets (named,
  never specified) and the KL term are unassessed.
- Fixes proposed in the [review](review_stele-mapping_v1.0.0.md) have not been
  probed. A v1.1 needs its own touchstone pass.
