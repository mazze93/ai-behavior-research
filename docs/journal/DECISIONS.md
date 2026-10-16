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
