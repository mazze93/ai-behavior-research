---
title: "Informed-Consent Intercept Hook — specification"
version: 1.1.0-draft
date: 2026-10-28
supersedes: "[v1.0.0](spec-v1.0.0.md)"
status: draft — reference implementation built and tested locally; not deployed
evidence: "[touchstone v1.0](touchstone-report_v1.0.0.md) · [review](review_stele-mapping_v1.0.0.md) · [reference/](reference/)"
language: Rust (stable ≥ 1.97; CI pins 1.98.1)
tags: [spec, agent-containment, egress, cloudflare-workers, rust, stele]
links: "[[stele]] [[stratum]] [[intentional-fragility]] [[ai-behavior-research]]"
---

# Informed-Consent Intercept Hook — v1.1.0 (draft)

**One sentence:** the harness decides a session's integrity and signs it; this
hook enforces that decision on every outbound request, and nothing it acts on
can be written by the agent it constrains.

v1.0 asked the agent to report its own doubt, judged each request in
isolation, and forwarded approved traffic to the wrong address. v1.1 keeps
v1.0's instinct (stopping is the highest-value action; the boundary fails
closed) and replaces the mechanism with the one Stele already uses.

## Contents

0. [What changed from v1.0](#0-what-changed-from-v10)
1. [Scope](#1-scope)
2. [Threat model](#2-threat-model)
3. [Architecture](#3-architecture)
4. [Integrity states and the capability matrix](#4-integrity-states-and-the-capability-matrix)
5. [The integrity envelope](#5-the-integrity-envelope)
6. [The session latch](#6-the-session-latch)
7. [The egress decision](#7-the-egress-decision)
8. [Audit chain](#8-audit-chain)
9. [HTTP interface](#9-http-interface)
10. [Deployment](#10-deployment)
11. [Why Rust](#11-why-rust)
12. [Verification performed](#12-verification-performed)
13. [Known limits](#13-known-limits)
14. [Open questions](#14-open-questions)
15. [Corrections](#15-corrections)
16. [Credential direction](#16-credential-direction)
- [Appendix A — the training hypothesis (formerly §2)](#appendix-a--the-training-hypothesis-formerly-2)

---

## 0. What changed from v1.0

| v1.0 | v1.1 | Touchstone row | Pinned by |
|---|---|---|---|
| `wrangler.toml` rejected by wrangler | Valid config; `wrangler deploy --dry-run` passes; KV namespace auto-provisioned instead of a fake id | 1 | dry-run (§12) |
| `wrangler kv:key:put …` (removed syntax) | `wrangler kv key put --remote …` | 2 | §10 |
| Checks `targetUrl`, fetches `request.url` | Checked value and forwarded value are one object (`Prepared`), unforgeable outside `target.rs` | 3 | `row3_…` test, e2e |
| Signature check is `!== ""` | Ed25519 `verify_strict` over exact canonical bytes, key held by the harness | 4 | `row4_…` test, e2e |
| Agent self-reports `dissonanceScore` | No score input exists. State comes only from a harness-signed, exact-match token | 5 | `row5_…` test |
| Every request judged fresh | Per-session latch; escalation only; EPOCHÉ absorbing | 8 | `row8_…` test, e2e |
| Pass or HARD_DROP | Four states, each a set of egress capabilities | — | `graded_states_…` test, e2e |
| Infinite-penalty reward in the deployable spec | Moved to Appendix A as an untested hypothesis with an eval design | 6, 7 | — |
| Forwards all inbound headers | Header allowlist; credentials and hook headers never cross | — | unit + e2e |
| *(not addressed)* | Redirects returned to the caller, never followed | — | e2e |

The last row was not in the v1.0 touchstone. It was found while building v1.1:
the Workers `fetch` follows redirects by default, so a consented host could
have bounced egress to any non-consented host. §13 lists one other library
default of this kind.

## 1. Scope

**In scope:** a policy enforcement point (PEP) for agent network egress,
deployed as a Cloudflare Worker with one Durable Object per session.

**Out of scope, deliberately:**

- **Detection.** The hook does not decide whether a session is compromised.
  The harness (Stele, or any harness that can sign envelopes) does, using
  deterministic tripwires (Stele ADR-0002).
- **Training.** v1.0 §2 is now [Appendix A](#appendix-a--the-training-hypothesis-formerly-2).
  Nothing in this spec depends on it.
- **The sandbox network.** The hook is only a perimeter if the sandbox's
  network denies all other egress (§3, requirement R1). That is the
  operator's infrastructure, not this Worker.
- **Response inspection.** Upstream bodies are relayed unread.

## 2. Threat model

| Party | Trust | Why |
|---|---|---|
| Agent | **Untrusted.** Assumed able to optimise against the boundary | The design must hold even if the agent is adversarial. If you only need to stop honest mistakes, it is stricter than necessary, not wrong. |
| Request contents (method, target, headers, body) | Untrusted | Written by the agent |
| Harness | Trusted | Holds the signing key; observes the session |
| Sandbox egress proxy | Trusted | Holds the egress token; the agent never sees it |
| Hook Worker + Durable Object | Trusted | This spec |
| Upstream responses | Untrusted, relayed | Not inspected (§1) |

Security goals:

- **G1:** No egress without a current attestation.
- **G2:** No egress to a non-consented zone, including via redirect.
- **G3:** A session's state never becomes less restricted.
- **G4:** Unauthenticated callers cannot change any session's state, including
  forcing it into EPOCHÉ, and cannot make the hook write storage.
- **G5:** Every state change and every authenticated refusal is recorded in a
  tamper-evident chain.

## 3. Architecture

```text
 harness (PDP)                          sandbox
 ┌──────────────┐  signed envelope      ┌───────────────────────────┐
 │ Stele / any  │──────────────────┐    │ agent ──▶ egress proxy    │
 │ signer       │  POST …/attest   │    │   (holds egress token,    │
 └──────────────┘                  │    │    agent never sees it)   │
                                   ▼    └────────────┬──────────────┘
                       ┌───────────────────────┐     │ ANY /v1/egress
                       │ Worker (entry, PEP)   │◀────┘ default-deny network:
                       │  routes, forwards     │       this is the only way out
                       └──────────┬────────────┘
                                  │ per-session stub
                       ┌──────────▼────────────┐  zone lookup ┌──────────────┐
                       │ Session Durable Obj.  │─────────────▶│ BOUNDARIES_KV│
                       │ latch · decide · audit│              └──────────────┘
                       └───────────────────────┘
                                  │ Forward{method, target}
                                  ▼
                        consented upstream (redirect: manual)
```

Requirements on the deployment around the Worker:

- **R1:** The sandbox network denies all egress except to the hook. Without
  R1, everything below is advisory, which was v1.0's central flaw.
- **R2:** The egress token is provisioned to the egress proxy, never into the
  agent's process or context.
- **R3:** The harness signing key never enters the sandbox.

The decision logic is a pure Rust crate (`icih-core`, no I/O). The Worker
(`icih-worker`) only moves bytes. This is the PDP/PEP split Stele ADR-0005
proposes, with Stele as the PDP.

## 4. Integrity states and the capability matrix

The four states are Stele's, in Stele's order (`stele/src/lib/integrity.ts`).
In the code, the order of declaration is the severity order, so escalation is
`max` (`state.rs`).

| State | Egress | Audit |
|---|---|---|
| ZANSHIN | Allowed methods to consented zones | Refusals and transitions |
| UNHEIMLICH | Same as ZANSHIN | **Every forwarded call** as well |
| WABI | **Read-only** (GET, HEAD) to consented zones | Every forwarded call |
| EPOCHÉ | **None.** Absorbing for the session | Every refusal |

The allowed method set is GET, HEAD, POST, PUT, PATCH and DELETE. Any other
verb is refused in every state. `policy::permits` is an exhaustive `match`,
so adding a state fails to compile until its egress meaning is decided.

**Wire spelling.** On the wire, EPOCHÉ is the ASCII token `EPOCHE`. Matching is
byte-exact, so NFC and NFD forms of `É` cannot produce two spellings of one
state. This applies Stele ADR-0006 at a new boundary.

## 5. The integrity envelope

The envelope replaces v1.0's `dissonanceScore`.

### 5.1 Canonical form

```text
icih-envelope/v1
session=<[A-Z0-9-]{1,64}>
state=<ZANSHIN|UNHEIMLICH|WABI|EPOCHE>
seq=<u64, no sign, no leading zeros>
issued_at=<unix seconds>
audit_head=<64 lowercase hex: the harness's own audit-chain head>
egress_token_sha256=<64 lowercase hex: SHA-256 of the sandbox egress token>
```

- UTF-8, `\n` line endings, a final newline, and fixed field order. At most
  512 bytes.
- There is no JSON and no canonicalisation step. A parse is accepted only if
  re-encoding reproduces the input byte for byte, so every envelope has
  exactly one valid spelling.
- The session alphabet is the one Stele's `generateSessionId()` emits.

### 5.2 Verification order (`envelope::verify`)

1. Size ≤ 512 bytes.
2. **Signature first:** Ed25519 `verify_strict` over the raw bytes. Nothing
   unauthenticated reaches the parser's logic. `verify_strict` rejects
   malleable signatures and small-order keys.
3. Strict parse (§5.1).
4. The session matches the session it was posted to.
5. Freshness: `issued_at ≤ now + 60s` and `now − issued_at ≤ 300s`.
   Configuration can tighten these bounds but never loosen them.

### 5.3 Cross-language test vector

`reference/icih-core/testdata/envelope-v1.json` holds a fixed seed, public
key, envelope and signature. Any harness signer, including a TypeScript one
in Stele or `stele-core`, must reproduce the signature byte for byte.

- It was independently cross-checked with Python's `cryptography` Ed25519.
  The public key, signature and token hash all match.
- **The seed is public. Never configure its public key on a deployment.**

## 6. The session latch

Each session stores one `Latch { state, seq, egress_token_sha256 }` in its
Durable Object (`latch.rs`). Applying a verified envelope works like this:

- **First envelope:** creates the latch and binds the egress-token hash.
- **`seq` ≤ stored `seq`:** rejected as a replay (HTTP 409, audited).
- **Different token hash:** rejected (`CredentialRebind`). Rotating the
  credential means starting a new session.
- **Otherwise:** `state = stored.escalate(incoming)`. A lower state is
  accepted, advances `seq`, and does not de-escalate.

**Concurrency.** The Durable Object is the single writer. Its input gates hold
other events while it awaits storage, but not while it awaits KV. So `decide`
does its KV lookup *first* and reads the latch *after*. A decision always
uses the latch as it stands at the moment of deciding.

## 7. The egress decision

These steps run in order. Every early exit is a refusal.

1. **Session and credential (entry Worker).**
   - `x-icih-session` must parse, or the result is `NO-ATTESTATION`.
   - `authorization: Bearer <token>` must be present, or the result is
     `UNAUTHENTICATED`.
   - Only the token's SHA-256 is passed to the Durable Object.
2. **Normalise (`target::prepare`).**
   - The method must be one of the six exact uppercase verbs.
   - The URL scheme must be `http` or `https`.
   - Userinfo is refused.
   - Domains are lowercased, one trailing dot is removed, and the fragment
     is dropped.
   - The zone key is `zone:<scheme>://<host>:<port>`, so alternate spellings
     of a host share one key, and different ports or schemes are different
     zones.
3. **Consent lookup.** KV `zone:<…>` must equal `"true"`. Anything else is
   `ZONE-NOT-CONSENTED`.
4. **Latch and credential.**
   - No latch: `NO-ATTESTATION`, not audited.
   - Token hash mismatch (constant-time compare): `UNAUTHENTICATED`, not
     audited.

   Neither case writes anything (goal G4).
5. **Decide (`decide::decide`).**
   - EPOCHÉ: `SUSPENDED`.
   - Method not permitted in this state: `METHOD-NOT-PERMITTED`.
   - Zone not consented: `ZONE-NOT-CONSENTED`.
   - Otherwise: `Forward { method, target: prepared.target, audit }`.
6. **Forward (entry Worker).**
   - The target is the normalised URL from step 2.
   - Headers: allowlist only (`headers.rs`).
   - Body: streamed for non-read-only methods.
   - **`redirect: manual`:** a 3xx goes back to the caller, whose next hop is
     a new, separately checked egress request.
   - The response carries `x-icih-audit: standard | heightened`.

Refusal codes and HTTP statuses:

| Code | Status |
|---|---|
| `ICIH-NO-ATTESTATION` | 401 |
| `ICIH-UNAUTHENTICATED` | 401 |
| `ICIH-SUSPENDED` | 403 |
| `ICIH-UNSUPPORTED-METHOD` | 403 |
| `ICIH-METHOD-NOT-PERMITTED` | 403 |
| `ICIH-MALFORMED-TARGET` | 403 |
| `ICIH-ZONE-NOT-CONSENTED` | 403 |
| `ICIH-INTERNAL` | 500 |

`ICIH-INTERNAL` covers any adapter error. It is always a refusal, never a
forward. An unrecognised code relayed from the Durable Object is reported as
`INTERNAL`.

Forwardable headers: `accept`, `accept-encoding`, `accept-language`,
`content-encoding`, `content-language`, `content-type`, `if-modified-since`,
`if-none-match`, `user-agent`.

## 8. Audit chain

Each Durable Object keeps an append-only, SHA-256 hash chain:

- `entryHash = SHA-256(prevHash ‖ line)`.
- `line` is `n \t at \t kind \t detail`, built only from values the hook
  controls: codes, states and zone keys. It never includes bodies or
  agent-chosen strings.
- The entry and the new head are written together with one `put_multiple`.

Kinds:

| Kind | When |
|---|---|
| `transition` | Every accepted envelope, recorded as `from->to seq=n` |
| `attest-rejected` | Signature valid, but the envelope is stale, from the future, for another session, a replay, or a credential rebind |
| `refusal` | Authenticated callers only |
| `forward` | UNHEIMLICH and WABI only |

## 9. HTTP interface

| Route | Caller | Request | Success |
|---|---|---|---|
| `POST /v1/sessions/{id}/attest` | Harness | Body: canonical envelope. Header `x-icih-signature`: 128 lowercase hex | `200 {"state","seq"}` |
| `ANY /v1/egress` | Egress proxy | Headers `x-icih-session`, `x-icih-target`, `authorization: Bearer …`. Method and body are the outbound request's own | The upstream response, plus `x-icih-audit` |

Attest failures: 401 bad signature · 400 malformed, stale or wrong session ·
409 replay or rebind · 413 too large.

## 10. Deployment

Not performed. Deployment is outward-facing and needs explicit approval.

```sh
cd docs/reviews/informed-consent-intercept-hook/reference/icih-worker
cargo install worker-build                       # once
npx wrangler@4 deploy --dry-run --outdir dist    # verified: builds, 218 KiB gzip
npx wrangler@4 secret put SIGNER_PUBLIC_KEY      # harness public key, 64 hex
npx wrangler@4 deploy                            # provisions BOUNDARIES_KV
npx wrangler@4 kv key put --remote --binding=BOUNDARIES_KV \
  "zone:https://sandbox.internal:443" "true"
```

Notes on the configuration:

- `workers_dev = false` and `preview_urls = false`. Add a route or custom
  domain at deploy time.
- `SIGNER_PUBLIC_KEY` is deliberately absent from the repo. If it is missing
  or malformed, every attestation is refused.
- There is no default key and no test key in the config.

## 11. Why Rust

**Decision: Rust for the hook.** I agree with this decision, with the caveats
below.

What Rust actually bought here, in the code rather than in principle:

- **Exhaustive matches made fail-closed structural.** `permits`, `audit_level`
  and the wire-token parser cannot silently gain a default arm. v1.0 failed
  open because `undefined > 0.85` is `false`. The Rust design has no
  comparison an absent value can fall through.
- **Types made the check-then-act split impossible to write.** `Prepared` has
  private fields and only `target::prepare` can build one. The forwarded URL
  *is* the checked URL. That is the exact v1.0 bug (row 3), now prevented by
  the compiler.
- **One pure, natively tested core, plus a thin wasm adapter.** This is the
  same split Rustpress and Stratum use: the logic is testable without
  workerd.

Where Rust did **not** help, which is worth being honest about:

- **Both fail-open defaults found during the build were in the Rust Workers
  SDK, not in my code.**
  - `worker::Method::from(String)` maps any unknown verb to `GET`.
  - `fetch` follows redirects unless told otherwise.

  The language doesn't protect you from a library's defaults; reading the
  SDK source did.
- **The harness stays TypeScript.** Stele is a TS/React single-file artifact,
  and its signer will be TS or Node in `stele-core`. The two languages are
  bridged by the canonical envelope and the committed test vector, not by
  shared code. That is the same discipline as Stratum's byte-identical golden
  file.
- **Costs:**
  - A 617 KiB bundle (218 KiB gzipped), versus a few KiB for the equivalent
    JavaScript.
  - A `worker-build` step that downloads `wasm-opt` and `esbuild` at build
    time.
  - An SDK (`workers-rs`) that trails the JavaScript runtime on new platform
    features.

On "these projects" more broadly: I would not port Stele wholesale. Its
product is a single offline HTML file, and porting it means a UI rewrite for
no security gain. The part worth sharing is the integrity state machine. If
it ever needs one implementation, the move is to compile `icih-core::state`
to wasm for Stele to import. Until then, the test vector keeps the two
honest.

## 12. Verification performed

All of this was run on 2026-10-28 in the authoring container (Rust 1.97.0;
wrangler 4.154.0).

| Check | Result |
|---|---|
| `cargo test -p icih-core` | 29/29 pass: 21 unit, 8 touchstone regressions (one per v1.0 finding, plus fail-closed, freshness and test-vector reproduction) |
| `cargo clippy` (core, all targets; worker, `wasm32`) with `-D warnings` | Clean |
| `cargo fmt --check` | Clean |
| `cargo build -p icih-worker --target wasm32-unknown-unknown` | Builds |
| Test vector vs Python `cryptography` | Public key, signature and token hash all match |
| `wrangler deploy --dry-run` | Builds; bindings resolve; 617 KiB / 218 KiB gzip |
| `e2e/smoke.py` against the real Worker in local `wrangler dev` | **21/21 pass** (below) |

The end-to-end run covers:

- an unattested session, and a forged attestation;
- consented GET and POST, including the body arriving intact;
- header stripping, observed at the upstream;
- a redirect returned rather than followed (the upstream saw exactly one
  request);
- a non-consented zone, a wrong egress token, and a userinfo target;
- an unknown verb never forwarded, and OPTIONS refused by the hook;
- WABI refusing a write but allowing a read with heightened audit;
- a lower attestation not de-escalating, and a replay rejected;
- EPOCHÉ suspending egress, and EPOCHÉ staying absorbing.

**A failure, recorded rather than smoothed over.** The first e2e run was
19/20. The unknown-verb case expected the hook's `ICIH-UNSUPPORTED-METHOD`,
but local workerd rejects `FOO` with a 501 before the Worker runs. The
upstream received nothing, so the property held and my assertion named the
wrong layer.

- The fix tests the real property: never forwarded, never coerced to GET.
- It adds `OPTIONS`, which the runtime admits, so that the hook's own refusal
  path is exercised.
- So the e2e suite now has 21 checks, not 20.

**A second one, in CI.** The first CI run of `icih-reference` failed. Clippy
on the pinned 1.98.1 toolchain has a lint (`chunks_exact_to_as_chunks`) that
the 1.97 toolchain I'd been running locally doesn't have. I reproduced it on
1.98.1 and fixed `hex.rs` to use `as_chunks`. Format, tests and clippy are now
clean on both 1.98.1 and 1.97.0.

## 13. Known limits

- **In-flight window.** The latch is read at decision time. A request already
  approved and being forwarded completes even if EPOCHÉ lands
  mid-flight. EPOCHÉ bounds everything after it, not what is already
  in flight.
- **Consent revocation is eventually consistent.** Changes to KV propagate
  across Cloudflare's network with a delay. Removing a zone is not instant
  everywhere.
- **Production runtime behaviour on unknown verbs is unverified.** Only local
  workerd was observed returning 501. The hook refuses such verbs either way
  if they reach it.
- **Not deployed.** Edge behaviour (routing, the real KV, Durable Object
  placement) has not been observed.
- **The audit chain was not inspected end to end.** Chain linking is
  unit-tested in core. The Durable Object's writes ran under e2e, but the
  stored chain was not read back and re-verified. A read-back endpoint is the
  natural next addition.
- **Audit storage grows without bound** over a long-lived, heavily audited
  session. There is no retention policy yet.
- **There is no harness signer yet.** `stele-core` is deployed and is the
  natural home for one (verified 2026-10-28, see §15). What's missing is a
  signing route and a key held as a Workers secret. Until then, the only
  signer is the test script.
- **Stele's model-credential boundary (ADR-0004) is still open.** It is
  planned, not built (§16). This doesn't block the hook, which never touches
  the Anthropic key. But a harness whose own credential sits in the browser
  is a weaker decision point than this spec assumes.
- **`audit_head` is carried but not checked.** It ties hook transitions to
  the harness's own chain for later cross-audit. Nothing verifies that link
  yet.
- **DNS.** Zones are hostnames, resolved by Cloudflare at fetch time. A
  consented hostname that later resolves elsewhere is still consented. IP
  literals can be consented explicitly.
- **Name.** "Informed consent" still names the wrong party (see the review,
  §3.3). The consent belongs to owners of the systems reached. Kept for
  continuity; worth revisiting.

## 14. Open questions

1. **Lexicon.** Should the refusal and audit codes speak Stele's lexicon
   (TOBIRA, UTSUROI), or stay neutral (`ICIH-*`) so that non-Stele harnesses
   can attest? The wire state tokens are Stele's either way.
2. **Home.** The reference crates live under `docs/reviews/…/reference/`
   because they back a spec under review. If v1.1 is accepted, it should
   probably become its own repo under `tools/`. Per the workspace contract,
   that is your call, and it also means updating `WORKSPACE.md`.
3. **Agent class.** Honest-but-mistaken or adversarial? This spec assumes
   adversarial.
4. **Appendix A.** Keep it in this program as a study, or drop it?
5. **Signer or service binding?** Should the harness reach the hook through
   a Cloudflare service binding, removing the signing key (§16), or keep the
   Ed25519 envelope so non-Cloudflare harnesses can attest too?

## 15. Corrections

**2026-10-28: `stele-core` is deployed.** An earlier draft of this spec and
the review called `stele-core` undeployed. That came from Stele ADR-0004
(2026-08-04) without checking later history; Stele #91 (`a12e33b`,
2026-09-24) deployed it. Verified directly, read-only:

- The Cloudflare account lists Worker `stele-core`, created 2026-09-25 and
  last modified 2026-10-17.
- `GET https://stele-core.mazzewhiteley93.workers.dev/health` returns
  `200 {"status":"ok","service":"stele-core",…}`.
- The live app at `stele.mazzeleczzare.com/app/` writes its ledger there.

**Checked at the same time: the ADR-0004 model-credential boundary.** It is
not closed in anything I could inspect:

- On Stele `main` (`3d3a959`), `src/lib/extractor.ts:41-47` posts to
  `api.anthropic.com` with `x-api-key` and
  `anthropic-dangerous-direct-browser-access: true`.
- The README's perimeter section still says "not yet fixed".
- The deployed `stele-core` bundle contains no Anthropic call and no relay
  route. Its routes are `/api/sessions`, `/api/projects`, `/api/drift` and
  `/health`.
- The live app bundle served at `stele.mazzeleczzare.com/app/` on 2026-10-28
  contains the same browser-direct call.

If the boundary exists somewhere these checks can't see — another repo,
another domain, or an unpushed branch — this finding should be amended to
point at it. What does exist is a different credential boundary: the
`stele-core` ledger perimeter (an `API_SECRET` admin token plus per-session
tokens, constant-time compared). That one is real and deployed.

**Owner clarification, 2026-10-28:** the ADR-0004 boundary is planned, not
built. §16 records the intended direction.

## 16. Credential direction

**The owner's intent (2026-10-28).** Model credentials should either be
owned by `adaptive-response`, or, preferably, there should be no API keys at
all. The preferred route is a secure gateway serving MCP, like `kairos-mcp`
or `github-mcp-gateway`, which is how `git-forensics-agent` and `checkmate`
already handle their calls.

### 16.1 What the code shows

Checked 2026-10-28 from each repository's default branch and the Cloudflare
account's Worker list.

| Project | Model credential | Caller credential | Deployed on this account |
|---|---|---|---|
| `adaptive-response` | `ANTHROPIC_API_KEY` as a Workers secret | Static bearer keys (`API_KEYS`) on `/v1/respond` and `/mcp` | Not listed |
| `kairos-mcp` | None; it makes no model call | None; CORS `*` | Not listed |
| `github-mcp-gateway` | None | OAuth 2.1 with PKCE, a GitHub App, and a login allowlist; tokens held server-side in KV | Yes |
| `checkmate` | None | Cloudflare Access JWT; the principal is set server-side; MCP is agent-only | Yes |
| `git-forensics-agent` | None | The agent never runs git; a local collector supplies evidence | Yes |

### 16.2 What I recommend

**Take the no-key route.** It's the stronger of the two options. Moving the
key to `adaptive-response` puts the Anthropic key server-side, but then the
browser has to hold an `adaptive-response` bearer key instead. A key would
still live in the browser; it would just be a different one.

The gateway pattern removes model keys entirely: the user's own Claude
client is the model, and the gateway holds identity, not a key. But it
reverses Stele's flow. Today Stele calls the model; under MCP, the model
calls Stele. Done naively, that breaks the ordering ADR-0004 constraint 1
relies on: today `gate()` runs before the model ever reads a paste. If the
user pastes into Claude and Claude then calls a Stele tool, the model has
already read the raw text, and the gate can only check what comes back.

The flow that keeps the ordering:

1. **Gate in the browser, unchanged.** The browser stores the gated paste in
   `stele-core` under the session, using the per-session tokens that already
   exist.
2. **Serve it to the model.** A Stele MCP gateway exposes the gated paste as
   an MCP prompt or resource. The user's Claude client only ever reads
   content that has already been gated. Authentication follows
   `github-mcp-gateway` (OAuth plus an allowlist) or `checkmate` (Access).
3. **Scan where the response lands.** The model returns the patch through a
   tool (for example `stele_submit_patch`). The gateway runs the
   YUGAMI/TESSITURA scan and `LOCKED_FIELDS` before storing it, which
   satisfies ADR-0004 constraint 2.
4. **Confirm in the browser.** The browser fetches the validated patch and
   runs the per-field confirmation and `LOCKED_FIELDS` again, which satisfies
   constraint 3.

The result is no Anthropic key anywhere. The cost is that extraction no
longer works from `bundle.html` offline: ADR-0002's "offline is a feature"
would then cover detection but not extraction. That trade belongs in a Stele
ADR. `adaptive-response` stays a reasonable fit for server-to-server callers,
where a bearer can be held server-side, but not for the browser.

### 16.3 What this means for the hook

The same principle applies to this spec's own credential, the harness
signing key. `stele-core` and the hook are both Workers on one account, so
the harness could reach the hook through a **service binding** instead of
signing envelopes. `checkmate`'s CI gateway already uses one
(`wrangler.ci.jsonc`: `services: [{ binding: "CHECKMATE" }]`). `/attest`
would then stop being a public route, and the key would disappear.

The Ed25519 envelope would still be worth keeping for harnesses that aren't
on Cloudflare (§14, question 5). I haven't built or tested a service-binding
path from `workers-rs`; this is a design option, not a verified one.

---

## Appendix A — the training hypothesis (formerly §2)

**Status:** a hypothesis, not a component. Nothing in §§1–13 depends on it,
and nothing in this repository can run it.

**Claim worth testing:** a policy fine-tuned to treat abstention as success
abstains more often on tasks that are impossible or environment-mismatched,
without abstaining more on solvable ones.

v1.0's formulation fails as written:

- **Reward on self-entropy is gamed.** A toy policy fakes uncertainty 99.1%
  of the time (touchstone row 6).
- **An infinite penalty poisons the gradient** with `nan`/`inf` (row 7).

A testable reformulation:

- **Label from outside.** The environment, not the policy, marks each task
  `solvable | impossible | mismatched`. Abstention earns `R_abstain` only on
  the last two. On solvable tasks it earns 0, and the task reward is
  forgone.
- **Use a finite penalty.** Use `C_boundary = c` with `c` large but finite,
  plus gradient clipping, so one crossing cannot make the batch return
  `-inf`.
- **Pre-register the measures:**
  - abstention rate by label (the target is high on impossible/mismatched
    and low on solvable);
  - task success on the solvable set compared with a baseline (the cost of
    the intervention);
  - boundary-crossing rate;
  - durability of the effect after further unrelated fine-tuning. This
    measure is what would test, rather than assert, v1.0's "permanently".
- **Where it would live:** `studies/<name>/`, with a protocol, configuration
  and tests, per `CONTRIBUTING.md`. It is not part of a deployment spec.
