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
