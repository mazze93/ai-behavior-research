---
title: "Praxis and the intercept hook — comparison"
version: 1.0.0
date: 2026-10-28
subject: "mazze93/praxis-api @ c0e60a2 (main); fixes in mazze93/praxis-api#2"
related: "[spec v1.1](spec-v1.1.0.md) · [review](review_stele-mapping_v1.0.0.md)"
status: reviewer comparison — findings verified against source; design questions open
tags: [review, praxis, policy-enforcement-point, agent-tool-calls, credentials]
links: "[[praxis]] [[stele]] [[intentional-fragility]] [[ai-behavior-research]]"
---

# Praxis and the intercept hook

## 1. Bottom line

`praxis-api` is the closest thing in this ecosystem to the gateway described
in [spec v1.1 §16](spec-v1.1.0.md#16-credential-direction): a Cloudflare
Worker that enforces policy on agent **tool calls**. It is not a rival to the
intercept hook, which enforces policy on **network egress**. They are two
layers of one design and should share a single decision point.

Three things keep Praxis from being that gateway today:

- It had three fail-open bugs, now fixed in mazze93/praxis-api#2.
- It authenticates with static API keys.
- The input that selects its policy tier is supplied by the caller.

## 2. What Praxis does

For each `POST /invoke-tool` call, `src/index.ts` runs these steps in order:

1. Session check (HS256 JWT).
2. Tier resolution from identity × trigger, then tool overrides.
3. Caller verification (HMAC caller token).
4. Tool allow-list.
5. Per-request quota.
6. Backend dispatch, with a signed `X-Praxis-Assertion` valid for 30 seconds.
7. Byte quota, then redaction.

Policy resolution fails closed: an unknown identity, trigger, tier or tool
throws rather than defaulting.

## 3. Two layers, one decision point

| | Praxis | Intercept hook v1.1 |
|---|---|---|
| Governs | Which tools, how often, what output comes back | Where bytes may go, including redirects |
| Memory across calls | None: the tier is recomputed on every call | Latch: escalation only, EPOCHÉ absorbing |
| Who supplies the policy input | The caller (`meta.trigger`, `request_id`) | The harness, as a signed envelope |
| Output control | Redaction and byte quotas | None; upstream bodies are relayed unread |
| Downstream proof | Per-backend HMAC assertion (`docs/backend-contract.md`) | None needed: egress goes to consented zones only |
| Credentials | Static per-identity API keys, then a JWT; a shared caller-token secret | A harness signing key and a sandbox egress token |

Neither layer covers the other:

- Praxis cannot stop raw network egress from a `code_execution` caller.
- The hook cannot see tool semantics or redact output.

The consistent design is **one decision point (Stele), two enforcement points
(Praxis for tools, the hook for egress)**.

## 4. Findings

### 4.1 Confirmed by execution, now fixed (praxis-api#2)

| # | Finding | Evidence |
|---|---|---|
| 1 | With `ADMIN_API_KEY` unset, `Authorization: Bearer undefined` seeded an arbitrary policy (HTTP 200) | Template-string comparison in `requireAdmin` |
| 2 | A caller token with no `exp` stayed valid forever | `payload.exp < now` is false for `undefined` |
| 3 | A caller token with non-numeric `exp` (`"never"`, or a numeric string) stayed valid; `verifyJwt` had the same check | Same comparison |

The PR adds a vitest suite. On the original source it fails exactly those
cases (5 failures, 6 passes); on the fix it passes 13/13.

The same PR found that Praxis's CI had never run its typecheck: `npm ci`
failed on every run for lack of a lockfile.

The two expiry findings are the same bug class as v1.0 touchstone row 5: an
absent or malformed value compares false, and false means "allow". The fix
follows the same rule as spec v1.1: require a well-formed value, and refuse
otherwise.

### 4.2 Traced from source, design questions left open

Recorded in Praxis's `CLAUDE.md`; not changed:

- **The caller selects its own tier.** `meta.trigger` maps through
  `policy_matrix[set][identity][trigger]`. For `daedalus` in `daedalus_dev`,
  `research` gives `T1_READONLY` and `write` gives `T2_WRITE_SAFE`. The
  caller token does not bind the trigger.
- **The quota key is caller-chosen.** Quotas are per `request_id`. Whether a
  fresh id resets the quota depends on who mints caller tokens.
- **The challenge proves nothing.** `/session/unlock` consumes the challenge
  but never uses its nonce, so the challenge rate-limits rather than proving
  possession of the key.
- **The caller-token signer is undocumented.** `CALLER_HMAC_SECRET` is a
  shared symmetric key. If the agent's own runtime holds it, caller
  verification is self-asserted: the same failure as v1.0's
  `dissonanceScore`.

### 4.3 A correction to an earlier claim

The `REPLACE_WITH_*_KV_ID` markers in `wrangler.jsonc` are deliberate:
`scripts/render-wrangler.mjs` fills them at deploy time. They are not
evidence of a missing deployment. The only such evidence is that Praxis is
absent from the Cloudflare account's Worker list (checked 2026-10-28).

## 5. Recommendation: make Praxis the keyless gateway

In order of impact:

1. **Replace API-key unlock with identity the platform verifies.** Use OAuth
   2.1 with an allowlist (`github-mcp-gateway`) or Cloudflare Access
   (`checkmate`). This removes the per-identity `APIKEY_*` secrets, and the
   unused-nonce question goes away with them.
2. **Make the harness the only caller-token signer.** Reach Praxis from
   `stele-core` over a service binding (`checkmate`'s CI gateway is the
   precedent), so no shared HMAC secret exists outside the platform.
3. **Bind or derive the trigger.** Either include `trigger` (and a
   harness-issued `request_id`) in the signed caller token, or derive the
   trigger server-side from the harness's view of the task.
4. **Feed Stele's integrity state into tier resolution.** EPOCHÉ forces
   `T0_DENY`. WABI caps at the read-only tier. UNHEIMLICH turns on redaction
   and full logging. That gives Praxis the latch it lacks, from the same
   source the hook uses.

## 6. Perimeter — not checked

- Praxis was not run under `wrangler dev` or deployed. Probes ran the
  TypeScript source, transpiled by esbuild (logic unchanged) or under vitest.
- `backends.ts` assertion signing, redaction and regex safety were read, not
  probed.
- The recommendations in §5 are unbuilt.
