# Decisions — append only

- 2026-10-16: Existing Worker/asset application verified on disk at 98dc820.
  The load-bearing assumption was that a landing build can join it without
  moving private routes; inspection confirms the Worker serves /index.html
  through ASSETS and separately gates private paths. Use Astro only for static
  composition, with local fonts and a small React island. Reverse by reverting
  the implementation; production remains unchanged until reviewed.
- 2026-10-16: The user approved the bounded typography direction and refined
  it toward Roslindale/Graphik, charcoal/porcelain and spectral interactions.
  Use OFL approximations rather than acquiring commercial font licenses.
- 2026-10-16: npm audit found known advisories in the skill's default Astro 6
  line, including vulnerable transitive image libraries. Use patched Astro
  7.4.0 and its compatible React integration instead; the old Worker remains
  the server. No user-supplied image optimization is introduced.
- 2026-10-16: User explicitly approved the Astro 7 bump. Fresh lockfile install,
  full repository tests, browser inspection, font readback, manifest negative
  controls and Worker dry-run passed. Touch dispatch is unavailable in the
  connected browser, so actual touch-device behavior is unverified. The local
  API has no production release data; inspect its unavailable state without
  injecting invented records. Preserve this limitation in the receipt.
- 2026-10-16: User approved the visual result and explicitly requested a safe
  checkpoint before a study-responsive iteration. Verified local/upstream
  3689dad, clean tree, open PR #11 and passing checks; push confirmed up to date.
  Inspected jacobmckee.com/index: hovering a row emphasizes it and activates a
  separate preview field (its media did not play in the connected browser).
  Translate the interaction with original SVG profiles, never copied media.
  Retain an explicit entry link distinct from click-to-preview controls.

- 2026-10-16: User found the header too tall during visual review. Reduce the
  desktop masthead from 110px to 76px; mobile uses a 98px two-row navigation
  grid with 44px links and compact visible labels. Full accessible labels and
  native routes remain. Measured at 745/1280 and 320/390 widths, with no
  horizontal overflow at the tested desktop/mobile sizes. The study selector
  returns focus to the chosen visual control when revealing the mobile stage.
  Full repository checks, deterministic staging and Worker dry-run passed.

## 2026-10-16 — verified repository release

User requested signed/verified tags, GitHub releases, clearer descriptions, tighter READMEs and visuals for mazze93/ai-behavior-research. Scope: root README, source/release documentation, a visual/source map and validation records; metadata and v0.1.0-rc.1 GitHub prerelease. Assumption checked: no existing tags/releases; current origin/main is a692219c45172ad409664d96de03e2302b7c0741. Preserve protocol freeze state, visibility, private data and open implementation PRs. Roll back documentation with a follow-up revert; metadata's previous values are recorded. Never move a published tag.

- 2026-10-16: Release candidate offline checks passed; executable source matches the named main baseline. Descriptions read back correctly and private visibility is retained. Release records distinguish signed source identity, historical browser/deployment evidence and remaining study boundaries. Corrections use a new tag; no published tag is moved.

- 2026-10-16: Published v0.1.0-rc.1 at aee386ece625436ce6cbb23fe870ef97c7733162; signed tag object 79adda52066063bad96e816943a6e6f5984d02a3 is Verified/valid on GitHub. Downloaded every release attachment and source archive; all asset digests/local bytes and all 281 source-file hashes match. Metadata and README are read back. Keep the immutable tag target; this follow-up record closes the actual publication audit without adding claims about studies or deployment.

- 2026-10-16: User invoked workspace:ship after source releases. Preflight found clean, pushed repositories and green CI; production still renders the older design. Deploy exact signed aee386e, keeping rollback ea04804c at hand. Current plain variables match reviewed config and current resource IDs match intended bindings. No runner/data/secrets changes. The initial local snapshot write used a relative path from apps/registry; it wrote no receipt. Corrected the root-relative path and re-read live metadata successfully before any deployment.

- 2026-10-16: Shipped signed aee386e as 2a0ddd68-f483-44e8-b4e6-442d1da5361b at 100%. Before/after resource descriptors and configured variables agree; full tag/source annotation is correct. Fresh build/dry-run, all 18 landing and 36 static hash comparisons, unchanged public release hashes, unauthenticated guards and production browser interactions passed. Python urllib was blocked by Cloudflare 1010, while default curl and browser succeeded without policy changes. Browser-automation /mcp warnings are external to the application; no application errors observed. Keep rollback ea04804c and explicit physical-touch/owner-file-chooser limits. Source release tags are unchanged.

- 2026-10-16: Implement the user's external-review request as explicit ethics and
  provenance commitments, with current capabilities separated from future
  protocol requirements. Model stop signals/refusals are observable behavior,
  not validated consent or welfare measures. No existing frozen record is
  retroactively labelled compliant. Keep private publishing sources out of
  assets. Revert documentation commits if needed; deployment rollback is
  2a0ddd68-f483-44e8-b4e6-442d1da5361b after live preflight confirms it.

- 2026-10-16: Public method audit is a selected export: 65 rerun engine tests,
  eight warnings and five-to-two declared frames. It expressly requires private
  source for full reproduction and does not expose the newly supplied PRIVATE
  compaction transcript. The site’s 51 tests, type checks, strict Astro build,
  generated assets, targeted links/data checks and 72-path deployment dry-run
  passed. Local desktop/narrow-page browser inspection and keyboard navigation
  passed. The initial one-off static-link check mistook the release API for a
  file; its explicit dynamic-route mapping was corrected without changing app
  code. Live preflight confirms rollback 2a0ddd68 and unchanged binding targets.

- 2026-10-16: Deployed clean, pushed 21a096e after exact-head CI passed. Version
  ccc9e98b is at 100%. The initial raw-hash check on the canonical domain found
  transport-injected .webmcp bridge and edge challenge scripts. Re-gated and
  verified all 46 selected assets byte-for-byte at the Worker origin. Six
  canonical pages match authored bytes only after the explicitly recorded,
  comparison-only removal of those two insertions; raw response hashes remain
  distinct. No cookies, spoofed headers or security-policy changes were used.
  Two public release bundles, binding targets, runtime and owner guards match
  the preflight. Production navigation and narrow emulation passed; screenshots
  and a reproducible read-only checker accompany the receipt. No inference,
  data migration, protocol freeze or private raw-source publication occurred.

- 2026-10-16: cloudflare-repo-ship found PR #13 already merged at d42feaf,
  with successful merge CI and application bytes identical to live 21a096e.
  Rechecked 51 local tests, build/staging, workbench, strict 72-path dry-run,
  zero reported advisories in both applications, 46 live assets, six canonical
  authored pages, two evidence bundles, binding/runtime descriptors and owner
  guards. Do not redeploy identical application content to relabel a commit.
  Record a fresh shipping audit and retain previous browser/receipt limits.
  Requested GitHub gateway is unavailable; authenticated CLI is the fallback.

- 2026-10-28: Reviewed the submitted Informed-Consent Intercept Hook spec v1.0.0
  (docs/reviews/informed-consent-intercept-hook/). Touchstone verdict: did not
  hold — wrangler rejects its config and KV commands, the Worker forwards to its
  own URL instead of targetUrl, signature and self-reported dissonance checks
  pass forged/missing input, refusals do not latch, and a toy policy fakes the
  §2 entropy signal 99.1% of the time. Decision: do not build v1.0; rebuild §3
  as a policy enforcement point consuming a harness-signed Stele integrity
  envelope (ADR-0005), latched per session; detach §2 as an untested training
  hypothesis. Reverse if the target agent class is scoped to honest reporters.

- 2026-10-28: Drafted the intercept-hook spec v1.1.0 in Rust with a reference
  implementation (docs/reviews/informed-consent-intercept-hook/reference/):
  pure icih-core (29 tests: unit + one regression per v1.0 touchstone finding)
  and an icih-worker Workers adapter (wasm32, clippy-clean, deploy dry-run
  passes). The real Worker passed 21/21 e2e checks under local wrangler dev.
  The first e2e run was 19/20: local workerd rejects unknown verbs with 501
  before the Worker runs, so the assertion named the wrong layer; corrected to
  assert "never forwarded" and added OPTIONS to exercise the hook's own path.
  Building it surfaced two fail-open SDK defaults not in the v1.0 touchstone:
  fetch follows redirects (now manual), and worker::Method::from maps unknown
  verbs to GET (raw method string used instead). Not deployed. Reverse the
  Rust choice if workers-rs proves unable to track platform features the hook
  needs; the canonical envelope + test vector keep the TS harness side
  language-independent either way.

- 2026-10-28: Correction. The intercept-hook review and spec v1.1 called
  stele-core undeployed, taken from Stele ADR-0004 (2026-08-04) without
  checking later history. It was deployed by Stele #91 (a12e33b, 2026-09-24);
  verified via the Cloudflare account listing and a live /health 200. Re-checked
  the ADR-0004 model-credential boundary at the same time: still browser-direct
  on Stele main (extractor.ts:41-47) and in the live app bundle; the deployed
  stele-core has no relay route. Recorded in spec v1.1 §15 as open pending a
  pointer from the owner. Lesson: a dated ADR status is a claim about its date;
  verify against history and the live surface before repeating it.

- 2026-10-28: Owner clarified that the Stele ADR-0004 credential boundary is
  planned, not built: adaptive-response as key owner, or preferably no API
  keys, via an MCP gateway in the github-mcp-gateway / checkmate pattern.
  Verified the candidates from source: adaptive-response holds the Anthropic
  key server-side but authenticates callers with static bearer keys (a browser
  caller would still hold a key); kairos-mcp, github-mcp-gateway, checkmate and
  git-forensics-agent hold no model key. Recommended the no-key route with the
  gate kept ahead of the model (gate → stele-core → MCP prompt → tool-returned
  patch scanned server-side → browser confirm). Recorded in spec v1.1 §16,
  with a service-binding option for the hook's own signer.

- 2026-10-28: Compared praxis-api with the intercept hook
  (docs/reviews/informed-consent-intercept-hook/praxis-comparison_v1.0.0.md).
  Praxis enforces tool calls, the hook enforces network egress; recommended
  one decision point (Stele) and two enforcement points. Fixed three
  fail-open bugs in praxis-api#2 (unset admin key accepted "Bearer undefined";
  caller tokens with missing or non-numeric exp never expired), each shown
  failing on the original source. Left open as design questions: caller-chosen
  trigger and request_id, unused unlock nonce, undocumented caller-token signer.
