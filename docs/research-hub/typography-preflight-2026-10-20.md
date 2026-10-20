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
2. **Snapshot production with the new verifier.** `verify_ethics_deployment.py` hard-codes the 2026-10-16 asset list. It would request `_astro/index.BB8Lg3bP.css`, which this build replaces with `_astro/index.Bob5jLOA.css`, and it never checks `type.css`. Use `scripts/verify_release.py` instead. It reads the asset set from `apps/registry/public/.assetsignore` (the same rules Wrangler uploads by) and mirrors `response-policy.ts` for the expected cache headers:

   ```sh
   python3 scripts/verify_release.py inventory     # offline; confirm the gallery is present
   python3 scripts/verify_release.py preflight --output docs/research-hub/typography-preflight-2026-10-20.json
   # deploy with a message naming the source commit, then:
   python3 scripts/verify_release.py verify --version <new-version-id> --source <commit> \
     --preflight docs/research-hub/typography-preflight-2026-10-20.json \
     --scope "Typography and layout only; no evidence, protocol or binding changes" \
     --output docs/research-hub/deployment-typography-2026-10-20.json
   ```

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

- `verify` checks: the health version on both origins, byte equality for all 49 public assets, the cache and CSP headers, canonical HTML, anonymous gating of `persona.html` and `/api/studies`, and unchanged evidence releases.
- Owner smoke test of the private surfaces (item 3).
- `verify_release.py verify` writes `docs/research-hub/deployment-typography-2026-10-20.json`. Browser readback stays a separate, manual step.

## Alignment with the account security standards

The reference standards are `mazze93/secure-container-template` @ `f42f1fd`, `mazze93/github-hardening-skills` @ `923d5f3` and the account policy `mazze93/.github/SECURITY.md` v2.0.0. They are written for containers and Node repos, so this section translates them for a Cloudflare Worker with static assets. Items are marked **met**, **gap** or **unverified**. Unverified means the setting lives in repository or Cloudflare settings that this checkout cannot read.

| Standard | Source | This repo | Status |
|---|---|---|---|
| Actions pinned to full commit SHAs | template README, org policy | `checkout`, `setup-node` and `setup-python` are SHA-pinned; Rust is installed with `rustup` at a fixed toolchain | met |
| Least-privilege workflow token | template `ci.yml`, skill 04/05 | `permissions: contents: read` at workflow level | met |
| CI concurrency group | template `ci.yml`, skill 04 | none; superseded pushes run to completion | gap |
| Named required status checks on `main` | template README, skill 01 | jobs `verify`, `rust-explorer`; whether a ruleset requires them is not visible here | unverified |
| Branch ruleset: signed commits, linear history, no force pushes, conversation resolution | skill 01 | #16 was squash-merged (linear); other settings not visible | unverified |
| Dependabot ignores semver-major; majors reviewed by hand | skill 02 template | no `ignore` block; #18 (checkout 4→7), #19, #20 and #25 are majors | gap |
| Dependabot `commit-message.prefix`, schedule time and timezone | skill 02 template | absent | gap |
| Documented pins excluded from Dependabot | `apps/landing/README.md` | `oxc-transform-react` / `@vitejs/plugin-react` are not ignored; #24 contradicts the pin | gap |
| Repo-specific `SECURITY.md` (scope, channel, SLA) | skill 06 | none; the account default in `mazze93/.github` applies (GHSA first, 72 h acknowledgement) | gap: this is a production service with auth and an evidence registry, so skill 06 recommends its own scope |
| Private vulnerability reporting enabled | skill 06 | not visible | unverified |
| Vulnerability reporting in CI (template: Docker Scout, non-blocking) | template `ci.yml` | no `npm audit` / `cargo audit` step | gap |
| Code scanning (CodeQL) | org policy "Security Features and Controls" | no workflow | gap |
| Secret scanning | org policy | GitHub-native for public repos; `check_repository.py` blocks tracked secrets by name pattern only | unverified |
| SemVer `VERSION` + `CHANGELOG` + signed tag per release | template release ritual | signed tag `v0.1.0-rc.1` exists; there is no `VERSION` or `CHANGELOG`, and this release has no tag | gap |
| Provenance for shipped artifacts | template (SBOM + provenance) | `landing-manifest.json` and the gallery `build-manifest.json` pin hashes; `verify_release.py` proves served bytes equal the source; no SLSA attestation | partial |
| HttpOnly cookies, parameterized queries, same-origin writes | user directive | `HttpOnly; Secure; SameSite=Strict`; D1 `.bind()` throughout; non-GET requires same `Origin` or `Authorization` | met |
| Server-side IP rate limits | user directive | `/api/login` has no throttle in code; tokens are high-entropy and compared with `timingSafeEqual`; a Cloudflare WAF rate-limit rule may exist outside the repo | unverified |
| Strict transport and headers | user directive | CSP `default-src 'self'`, `frame-ancestors 'none'`, nosniff, `no-referrer`, Permissions-Policy, HSTS 1 year (no `includeSubDomains`) | met |

### Applied in #26

1. `.github/dependabot.yml`: ignores semver-major in every ecosystem and the documented landing pins; adds the `chore` prefix and a Monday 09:00 America/New_York schedule.
2. `.github/workflows/registry.yml`: adds a `concurrency` group and a non-blocking `npm audit --audit-level=high` step for both npm packages. `cargo audit` is not added, because it would install an unpinned tool on every run.
3. `SECURITY.md`: scoped to this service; defers SLAs, disclosure and safe harbor to the account policy. No email contact was invented, because the README lists none.
4. `VERSION` (`0.1.0-rc.2`) and `CHANGELOG.md`. Tag this release `v0.1.0-rc.2`, signed with your key.
5. `.github/workflows/codeql.yml`: JavaScript/TypeScript, Python and Actions scanning, with `github/codeql-action` pinned to the v4.38.3 commit `24c5418`.

Settings only you can change: the branch ruleset (skill 01), private vulnerability reporting (skill 06), repo settings (skill 05), and a Cloudflare rate-limit rule on `/api/login`.
