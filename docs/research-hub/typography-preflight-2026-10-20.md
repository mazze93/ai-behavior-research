# Typography release preflight — 2026-10-20

Candidate: `main` @ `edfc3fb` (#15 Basteleur, #16 typography/compaction, #18 checkout bump, dependabot config).
Production is not yet updated. The last recorded deployment is `ccc9e98b-5182-4fbb-bf8b-2a54d48edfff` (source `21a096e`, 2026-10-16).

## Verdict

**Go, with two required steps before `wrangler deploy` and one sequencing rule.**

| Check | Result |
|---|---|
| `make test` on `main` | pass (registry 33/33, typecheck, landing check + build, stage guard, Python suites, boundary check) |
| CI on `edfc3fb` (Research omnibus) | success |
| Chromium render probes on `main` (all hub, registry and landing pages, 320–1920px) | no horizontal overflow; disabled-hover, sticky pin and reduced-motion behave as designed |
| `stage_landing.py --check` | 18 assets match manifest and strict CSP |

## Required before deploy

1. **Rebuild the explorer gallery.** `wrangler.jsonc` runs `check_explorer_gallery.py` as its build step, and that guard fingerprints `scripts/build_explorer_gallery.py`. #16 changed the builder (the gallery page now links `/type.css`), so any gallery built before #16 is refused. Rebuild into an empty directory as documented in `tools/evidence-explorer/README.md`. Do not hand-edit the old `index.html`: without `type.css` the gallery loses its fonts and family tokens.
2. **Write a verifier for this release.** `verify_ethics_deployment.py` hard-codes the 2026-10-16 asset list. It would request `_astro/index.BB8Lg3bP.css`, which this build replaces with `_astro/index.Bob5jLOA.css`, and it never checks `type.css`, `prepare.css` or `prepare.html`. Derive the asset set from `landing-manifest.json` plus the root `.html`/`.css` files instead of copying the list forward.

## Sequencing

Deploy `edfc3fb` before merging any open Dependabot PR (#19–#25), so this release changes only presentation.

- #24 (`oxc-transform-react` 0.145.0 → 0.154.0) contradicts the pin documented in `apps/landing/README.md`. That README says the Vite React plugin needs 0.145.0.
- #21 and #22 change `tools/evidence-explorer/Cargo.lock`, which is part of `renderer_hash()`. Merging either one makes the gallery stale again.
- #23 changes the deploy tool (`wrangler`), and #19, #20 and #25 are major version bumps. Keep these out of a release whose purpose is visual.

## Overlooked areas

1. **The Dependabot config has no `ignore` rules.** The documented `oxc-transform-react` / `@vitejs/plugin-react` pin will be re-proposed every week. Add ignore entries, and consider grouping minor/patch updates.
2. **Mixed old and new assets for up to 5 minutes.** HTML is `no-store`, but CSS is `max-age=300`. For up to five minutes a browser can pair new HTML with a cached old `hub.css` or `style.css`. During that window the persona `.field-grid` and the method `.card-flow` render unstyled. The persona page is owner-only, so the impact is low. Versioned file names or query strings would close the window if that ever matters.
3. **Private surfaces haven't been tested with real data.** Console, review, release and the persona studio were only rendered without the API or a session. After deploy, sign in as owner and smoke-test: load a packet, score one response, export, and open a release.
4. **Chromium only.** Safari and Firefox are untested. The CSS used (`@layer`, `:not()` lists, `min()` in `minmax`, `(hover:hover)`) is supported in Safari 15.4+ and current Firefox. The pinned `.reading-pin` column scrolls internally, and Safari does not make that region keyboard-focusable on its own. Its children (transcript, details) are focusable, so it is reachable, but check it by hand.
5. **This is a visible brand change.** Registry pages move from Impact/Arial to Bodoni Moda/Manrope, and the spectrum bar now develops on load. Confirm both are intended before they reach the public.
6. **Remaining type debt.** `style.css` still sizes text in px, so only its root follows the reader's default. `apps/workbench` still uses Arial. Small metadata text (`.65rem` ≈ 11.7px) is unchanged.
7. **Rollback target.** Before deploying, run `wrangler deployments list` and record the actual current version, then use that version as the rollback target. Records stop at 2026-10-16, so a later deploy may exist that isn't recorded here.

## After deploy

- Health endpoint version matches the new version on both origins.
- Public assets byte-match the source, including `type.css`, `hub.css`, `style.css`, `prepare.css`, `research-notes.css` and the new landing CSS.
- Owner smoke test of the private surfaces (item 3).
- Record the outcome in `docs/research-hub/deployment-typography-2026-10-20.json`, following the existing records.
