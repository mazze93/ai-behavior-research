# Charcoal / porcelain landing revision

Implement the user's accepted font/material direction in ai-behavior-research.
Scope: apps/landing, shared registry public typography/palette, generated
landing assets, build/staging scripts, asset response policy, and design record.

1. Verify existing source and font/dependency provenance; record the design.
2. Implement self-hosted poster typography and one progressive React island.
3. Build, inspect in browsers, exercise offline/reduced-motion boundaries.
4. Commit/push a reviewable change; leave production publication for review.

## Iteration 2 — study-linked visual stage

Baseline 3689dad is clean, pushed and green in PR #11. Preserve that checkpoint.
Translate the index-to-stage interaction inspected at jacobmckee.com/index:
temporary hover/focus previews, persistent click selection, distinct original
optical forms per existing study, and direct study-entry links. Scope is the
landing React components, their layout, generated assets and verification
records. No new study capabilities or production publication are implied.

User steering: tighten the masthead while preserving the approved typography.
Iteration implemented and locally verified; see the study-stage receipt for
keyboard, pointer, reduced-motion, narrow-width and static fallback boundaries.

## 2026-10-16 — verified repository release

User requested signed/verified tags, GitHub releases, clearer descriptions, tighter READMEs and visuals for mazze93/ai-behavior-research. Scope: root README, source/release documentation, a visual/source map and validation records; metadata and v0.1.0-rc.1 GitHub prerelease. Assumption checked: no existing tags/releases; current origin/main is a692219c45172ad409664d96de03e2302b7c0741. Preserve protocol freeze state, visibility, private data and open implementation PRs. Roll back documentation with a follow-up revert; metadata's previous values are recorded. Never move a published tag.

## 2026-10-16 — workspace:ship production follow-through

Deploy signed v0.1.0-rc.1 / aee386e as the existing web Worker, after fresh
staging and deployment dry-run. Exact scope is in the shipping plan. Current
production and rollback version ea04804c is independently read back. Reconcile
remote bindings/variables, verify live assets and browser interactions, then
record the production receipt and update stale deployment status in the README.

## 2026-10-16 — external review, ethics and provenance

Implement essential research-method corrections from the Box addendum.
Scope: public ethics page, method and study-page disclosures, landing footer,
llms.txt, sitemap, generated landing assets, README and verification receipt.
Assumption checked: no ethics statement exists in the current method or Persona
page; author/annotation provenance and behavioral-only limits already exist.
The private publishing revision lives in intentional-fragility; private reviews
and transcripts do not become public assets. Build/stage and dry-run before any
deployment; verify public bytes, navigation and owner guards afterwards.
Rollback is the current production version 2a0ddd68-f483-44e8-b4e6-442d1da5361b.

## 2026-10-16 — cloudflare-repo-ship recheck

Reconcile merged PR #13 with production before considering another deployment.
Scope: README, shipping audit/receipt and existing journal files only. Fresh
source comparison confirms merged d42feaf and live 21a096e have identical
application/staging content. Preserve production ccc9e98b; documentation rollback
is a follow-up revert. Keep the companion private book draft PR open.

## 2026-11-13 — research lifecycle infrastructure and the book's companion surface

Ask, restated: reorganise research.mazzeleczzare.com from a site about two
studies into the public face of an open research infrastructure built around a
versioned research object (Question → Hypothesis → Protocol → Execution →
Observation → Analysis → Claim → Review → Publication), with Identity
Dissolution and Persona Integrity as reference implementations. In parallel,
bring *The Intentional Fragility* (private `mazze93/intentional-fragility`) to
a state where the only remaining publication steps are the author's own, and
ship its public surface alongside the site so the two read as one argument.

Repositories and paths this work may modify:

- `mazze93/ai-behavior-research` (branch `claude/method-audit-ur72ow`):
  `docs/journal/`, a new `docs/research-object/` contract, `apps/landing/`,
  `apps/registry/public/` authored pages, `apps/registry/src` and `tests` only
  where a phase names them, `scripts/stage_landing.py` manifest, README.
- `mazze93/intentional-fragility` (new branch, same name): `docs/00-overview/
  ROADMAP.md`, `docs/journal/`, licence files, `surfaces/`, engine tooling.
  Chapter prose in `manuscript/chapters/` is not edited; proposed sentences go
  in a separate review packet.

Not in scope for this plan: multi-user accounts and workspaces, third-party
execution budgets, human-subject study templates, DOI deposition, production
deployment, public release of the book. Each needs its own decision.

Phases (each ends in a commit and a ticked checkbox):

1. **Research-object contract.** Typed stages, permitted transitions and
   evidence grades (smoke, pilot, exploratory, confirmatory, replicated) as a
   versioned schema with tests; map both studies and the book onto it and
   record where each one does not fit.
2. **Method-audit corrections.** Fix the meta description that overstates
   independence; add a dated note for the unpublished leave-one-out result.
3. **Book: mechanical publishability.** Reproduce `make check` and
   `make release`; refresh the stale roadmap; land the ADR-0012 licence files;
   write the author's review packet (unnamed audit warnings, D6, front matter,
   length gap) without touching chapter prose.
4. **Lifecycle site structure.** Landing and navigation organised by
   Explore, Design, Laboratory, Analyze, Collaborate, Publish and Learn. Every
   capability is labelled as working, specified or not built.
5. **Bearing Table as the companion surface.** Review its data for private
   material, then stage it through the reviewed-manifest path as the
   claim-to-evidence view for the book and the site.
6. **One lifecycle path end to end** on Identity Dissolution: fork, bounded
   configuration, evidence package, analysis, publication package manifest.
   Implement only the missing links found in phase 1.
7. **Verification and hand-off.** `make test`, both repos' CI, deploy dry-run,
   draft PRs, and a list of the human-only actions that remain.

## 2026-11-13, burst 2 — merge and ship the lifecycle surface

Ask, restated: with everything approved and autonomy granted, take the merged
lifecycle work to production: merge both PRs, deploy the web Worker by the
documented manual procedure so `/lab.html` is live, verify it, and record the
receipt. Chapter prose and accounts stay out, for the reasons already logged.

Paths this burst may modify: `docs/journal/`, a dated deployment receipt and
note in `docs/research-hub/`, `README.md` status lines. The generated
`apps/registry/public/explorers/` gallery is built locally and is ignored.
Outside Git: one deployment of `identity-research-web`.

Phases:

1. Merge PR #50 and intentional-fragility PR #19 (done before this entry).
2. Deployment preparation: pinned Rust toolchain, explorer gallery from the
   two checksum-verified public releases, `make test`, guarded dry-run.
3. Deploy the web Worker only; record the previous version as rollback.
4. Live verification: new page and bundle, existing pages, release registry,
   anonymous refusals on private routes.
5. Receipt, README status, journal close-out.
