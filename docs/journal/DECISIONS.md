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
