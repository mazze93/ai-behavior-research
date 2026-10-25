# Changelog

Notable changes to the research site and registry. Versions follow SemVer and
are released from signed `v*.*.*` tags (the release ritual in
mazze93/secure-container-template). `VERSION` holds the version being prepared.

## [0.1.0-rc.2] - unreleased

### Added
- Inline research cabinet superseding the landing modal: visual apertures, native multi-brief reading, local filters and in-place citations.
- Split research index with independent panels, contextual reading surfaces and a server-rendered directory fallback.
- Version-controlled Worker issue grouping and a dated domain/gateway review.
- Research ethics statement and a bounded public method audit (#13).
- Shared `type.css`: one self-hosted type system (Bodoni Moda, Manrope, Basteleur, one monospace stack) for every hub and registry page and the explorer gallery (#16).
- `hub-css` guard tests: layer order, relative root size, defined tokens, used keyframes, no dead selectors, `type.css` linked first (#16).
- Release tooling: `scripts/verify_release.py` (`inventory`, `preflight`, `verify`) with the asset set derived from `.assetsignore` (#26).
- `SECURITY.md` scoped to this service; CodeQL code scanning; Dependabot configuration (#26).

### Changed
- Persona Integrity headings and rubric letters use self-hosted Basteleur (#15).
- `hub.css` restructured into cascade layers with tokens; registry pages move from Impact/Arial to the shared type system; compact layouts, two-column method page, pinned reading column (#16).
- Landing monospace uses the shared stack; root font size is relative; smooth scrolling removed (#16).
- CI cancels superseded runs and reports npm advisories without gating; Dependabot ignores semver-major bumps and the documented landing pins (#26).
- `actions/checkout` 4.4.0 → 7.0.1 (#18).

### Fixed
- Gateway automatic retry defaults aligned with single-attempt research collection; patched fast-uri and Undici tooling dependencies.
- Horizontal overflow at 320–390px on the persona studio and analysis desk; disabled buttons taking the hover gradient; mobile header nav hiding links off-screen (#16).

## [0.1.0-rc.1] - 2026-10-16

First signed release of the research site: Astro landing, registry Worker, explorer gallery and production verification records.
