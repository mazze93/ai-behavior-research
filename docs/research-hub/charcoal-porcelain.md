# Charcoal / porcelain — landing direction, 2026-10-16

Accepted direction: anachronistic brutalism, poster-sized tightly set uppercase
type, softer charcoal and quiet porcelain, chromatic interaction, and one
memorable full-color animated element per landing page. Basteleur is reserved
for the earlier study guide and no longer governs the shared site shell.

## Typography and material

Roslindale by David Jonathan Ross (https://djr.com/roslindale) and Graphik by
Commercial Type (https://commercialtype.com/catalog/graphik) are the requested
references. No licensed webfont files were found in the site checkout. This
implementation uses Bodoni Moda 900 and Manrope 400–800 as open approximations,
not copies or metric-equivalent substitutes. Both Fontsource packages carry
OFL-1.1 licenses and are pinned in the landing lockfile. Fonts are bundled
locally; no browser-time font service is used. Licensed originals can replace
the local font providers later without changing the design's semantic roles.

Porcelain #f3f2ee is smooth and continuous. Charcoal #242321 carries a subtle
original SVG grain. Fine gray rules and monospaced record details retain the
institutional/printed character. Spectral color is concentrated in one folded
optical form and in hover, keyboard-focus, and pressed controls. Body copy
remains high contrast. Color never encodes scientific validity.

## The spectral fold

A deterministic SVG contour sculpture, rendered before JavaScript and hydrated
as a React island on idle. Pointer motion and a keyboard/touch-operable turn
button change its orientation. A finite animation plays only on request;
there is no endless ambient loop. Reduced motion preserves the full-color
static sculpture and immediate orientation changes. It is explicitly an
interactive illustration, not research data. Offscreen work is avoided.

## Build and integration

Scope is the existing mazze93/ai-behavior-research site: apps/landing sources,
shared registry typography/palette, generated public landing assets, build
entry points, and the existing asset-response policy. Research protocols,
execution APIs, private annotation flow, and evidence are outside this change.

Verified assumption: the site is an existing Worker with static assets and
strict same-origin CSP, not an Astro application. Astro 7 is a static compiler
for the landing page only; the existing Worker remains the Cloudflare adapter
and owns auth/routing/headers. Introducing a second server adapter would
duplicate that ownership. Staging externalizes Astro's inline bootstrap scripts
and styles, preserving the current CSP without unsafe-inline. Only manifest-
listed generated files may enter the existing public assets tree.

The offline-compatible surface includes the shell, typography, sculpture and
interaction. Current public release data still requires the registry API;
unavailability is visible and never replaced with fabricated records. No
service worker is introduced to cache protected or research responses.

## Validation and rollback

Validate strict TypeScript, registry tests, deterministic staging, public asset
manifest integrity, desktop/mobile overflow, keyboard/touch interactions,
reduced motion, JavaScript-disabled rendering, and local use with external
network blocked. Inspect the result before production publication.

All work is on codex/charcoal-porcelain from 98dc820. Revert this branch's
implementation commit to restore the previous site. Production is unchanged;
the prior deployed Worker remains ea04804c-200d-4c6c-889f-7e2c063b9aa3.
