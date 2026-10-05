# Research hub expansion: design and completion contract

## Intent

Make research.mazzeleczzare.com a usable starting point for Mazze's research: discover studies grounded in the corpus, launch suitable experiments, collect evidence, run advanced analysis and prepare publications. Each study has its own experimental identity, structure and allowances. Work in reviewable bursts with commits and pushes. The objective is not satisfied by a portfolio page, a module directory or a single generalized protocol editor.

## Chosen architecture

Use shared evidence services plus study-specific adapters and interfaces. A generic dashboard would flatten incompatible experimental designs. Independent applications for every study would duplicate identity, publication and integrity logic. Shared services preserve those invariants while letting a rubric studio, longitudinal instrument and replay laboratory differ substantially.

Common concepts are source records, study versions, run/import events, artifact hashes, analysis specifications, authorship/permissions and reviewed releases. A module declares its own data model, executable capabilities, budgets, rendering routes and publication constraints. The current Identity Dissolution executor remains a specialized adapter; it is not the universal run schema.

Catalog entries distinguish discovery, source-inspected, implemented, locally tested and production-verified capabilities. A configured route or attractive button must never imply runnable machinery. Private source metadata is not automatically copied into public assets.

## Workstreams and required evidence

1. **Corpus acquisition.** Read sources across local projects and connected collections. Record exact source revision/hash, reading scope, privacy and supported/unsupported claims. Done only when candidate modules have substantive reviewed inputs and provenance, not names from search results.
2. **Study-specific hub.** Public research index plus private workspace, with distinct module routes and honest capability states. Identity Dissolution receives its own iterative redesign. Verify desktop/mobile rendering, navigation, keyboard behavior and preserved release links.
3. **Execution and collection.** Versioned adapters with appropriate experiment shape, cost/limits, cancellation, raw evidence and failure preservation. Test real execution for each enabled adapter. No live participant/security experiment may be launched merely because a proposal exists.
4. **Solo-first annotation.** Permit one rater, optional additional raters, blinded presentation limits, append-only submissions and later adjudication. Delayed re-rating requires explicit rounds with stable person identity; no second account workaround. Verify actual API persistence and visibility boundaries.
5. **Advanced analysis.** Versioned Python analysis specifications, provenance-linked inputs, uncertainty estimates, paired/clustered designs where justified, exclusions/missingness, cutoff sensitivity and reproducible figures. Local-only modules return reviewed aggregates. Validate against analytical/synthetic checks and independently recompute real recorded inputs.
6. **Publication preparation.** Claim-to-evidence matrix, manuscript structure, citations, reproducibility package and figure/table exports with declared limitations. Drafts cannot promote historical assertions into newly reproduced findings. DOI/deposit status only follows actual deposition.
7. **Operations and review.** Private controls, dependency review, dry-run before deployment, rollback, no secrets/raw private corpus in Git, schema migrations compatible with existing evidence. Verify site behavior and permissions after each deployment. Review progress against the full objective at every checkpoint.

## First implementation slice

Record the reviewed source map and fingerprints; fix solo assignment in the existing registry; expose accurate annotation-design metadata in future releases; retain old snapshots unchanged. Establish tests for one/two raters, duplicates, nonexistent raters, idempotency and unauthorized access. An explicit future round model is still needed for delayed rescoring.

Then build the hub catalog and module routing from the evidence map, with specialized Identity Dissolution and Persona surfaces first, followed by Class Closure and local Context Synapse adapters. Observatory and uplift proposals remain accurately marked until their instruments are implemented and validated.

## Boundaries and rollback

No raw Context Synapse telemetry leaves its device; no interim outcome inspection. No restricted advisory/testbed content becomes public through bulk corpus import. Existing frozen protocols, artifacts and release URLs are retained. Application edits use a feature branch and revertible commits; migrations must be additive with an explicit rollback/forward-recovery note. A deployment records old/new Worker IDs so code can roll back without deleting evidence. Current burst has no production mutation.

## Uncertainty

Source reading is incomplete across the corpus. Class-closure results have not yet been independently rerun in this project. The original study's empirical coverage remains small; a technical smoke test is not a powered pilot. The user's selection of solo-first does not validate any particular construct or remove within-author bias. These uncertainties remain visible in module status and publication drafts.
