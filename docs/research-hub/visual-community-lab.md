# Visual, community-facing research lab

User direction, 2026-10-08: first-class native visualization, inherent Hugging Face integration and possible public mirror, useful collaboration with humans/models/agents, strong science communication, agile methods and low barriers to entry. Preserve the full research-hub completion contract; these requirements extend it. This is a build specification, not a claim that these capabilities have shipped.

## Next usable increment: visual evidence explorer

Add a study-specific visual workspace directly to the site. Identity Dissolution needs a factorial coverage matrix, paired effect plots, failure/cutoff summaries and response-level drill-down. Persona needs categorical distributions, evidence excerpts and disagreement views; it must not inherit continuous-score assumptions from the factorial instrument.

A mark must resolve to its source release/run IDs. Missing data must remain visibly distinct from zero. Filters change a view, not the frozen study or its prespecified analysis. Display phase, exclusions, denominator, requested seed caveats and analysis version beside relevant plots. Do not present smoke observations as a pilot result. Provide accessible tables and keyboard selection alongside charts.

Acceptance evidence: deterministic fixtures with known counts/effects; comparison to the verified Python report; desktop/mobile interaction; chart-to-raw linkage; exported figures with source hash, analysis specification and filter state. Use standard scientific plotting for publication SVG/PDF/PNG, with the same verified inputs as the interactive view. A browser viewer should not require installing Python to inspect published results.

## Hugging Face integration and mirror

Keep GitHub as the authoritative source repository and the registry as the canonical evidence origin. Build an explicit export boundary for reviewed public artifacts. A Hugging Face Space can provide a discoverable public explorer, while dataset repositories can hold licensed release snapshots and dataset cards. This architecture requires current Hub/API verification before implementation; no mirror or Hub repository has been created yet.

Each export needs source release/hash, code revision, provenance, license, limitations, and a canonical link. Preserve model IDs and recorded revision availability; never infer immutable weights from an alias. Build and test a dry-run manifest before publishing. Do not mirror private Git history, owner controls, credentials, private annotations or restricted corpus sources. Verify readback hashes and record actual external repository/revision only after publication succeeds.

Acceptance evidence: a reviewed export manifest, schema-valid dataset/card, synthetic private-data exclusion tests, actual configured namespace, successful readback of a public test artifact, and an accessible mirror linking to its exact canonical evidence. Mirror availability must not make the canonical lab dependent on Hugging Face uptime.

## Collaboration primitives

Use explicit actor kinds (human, model, agent), stable contributor identity, scoped capabilities, versioned assignments, append-only proposals/annotations, and author-reviewed releases. A model critique is not an independent human rating. Record software/model version, prompts, tools, intervention history and costs for automated contributions. Human identity and independence require evidence beyond account counts.

Agent-facing operations should share the same validated study adapters as the human UI. Begin with read/inspect/propose actions; execution needs an explicit experiment budget and scope. Preserve failures and interruptions. Agent delegation must not multiply inference silently. Collaborative review should make alternative interpretations, amendments and unresolved disagreements inspectable rather than forcing consensus.

Acceptance evidence: role/actor boundary tests; provenance through proposal, execution, review and release; stable identities across repeated annotation rounds; a second real contributor completing a bounded task; reproducibility of an automated contribution without presenting it as human testimony.

## Science communication and lower barriers

Make each public claim navigable to its evidence, counterevidence, method and limitation. Provide a short plain-language reading, a technical account and a reproducibility route. Ship meaningful examples and guided paths for inspecting a result, annotating a response and proposing a replication. Clearly separate synthetic walkthroughs from empirical observations. Prototype uncertain interfaces with small reversible increments, then evaluate whether a person can complete the intended research task.

## Cost discipline

- No model calls for chart rendering, filtering, hashes, schema validation, deterministic statistics or formatting known data.
- Keep a concise source register and task journal; read changed or directly relevant sections instead of rescanning the corpus each burst.
- Review consequential scientific/security decisions; avoid repeated full-context agent reviews for minor presentation edits.
- Give automated jobs token/cost caps, stop conditions and recorded usage. Cache read-only metadata and reusable computation by content hash. Experimental inference retains its frozen cache policy; do not reuse cached generations as independent observations.
- Prefer small tested commits and targeted checks. Repeat full checks after dependency, schema or execution changes, not after every prose edit.
- Measure progress by runnable user workflows and evidence, not document volume or architectural novelty.
