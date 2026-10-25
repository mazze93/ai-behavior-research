# Research cabinet / visual guide

Deployable Astro landing redesign. The landing is the workspace, rather than a cover page in front of a modal directory.

**Tone:** editorial research cabinet. **Type:** self-hosted Basteleur Bold + Manrope, with Bodoni for editorial asides. **Color:** paper/ink; acid yellow and cyan identify the active path. **Memorable element:** apertures in instrument cards uncover original chromatic specimens; the card itself unfolds into its research brief.

## Bounded inspiration

Three primary search results: Experimental Jetset's archive (https://jetset.nl/), its archive preface and DIA's table of contents (https://dia.tv/toc/). The Jetset archive was directly inspected in the browser: four dense columns, persistent index controls, clear chronological metadata, hairline structure and little wasted navigation space. DIA informs the compact table-of-contents approach; its motion behavior was not directly inspected. The user's earlier Klasse Grafik recording remains the reference for maintaining context while opening a surface. No reference artwork, text or code is copied.

## Composition

```
MAZZE / RESEARCH                         Instruments  Record  Methods  Owner
RESEARCH / INSTRUMENTS / [focused card]                 [color specimen]
┌───────────────────────────────────────┬─────────────────────────────┐
│ A field of inquiry.                   │ WHAT / METHODS / LIMITS      │
│ large, sculptural two-line type       │ Compact orientation & index │
├───────────────────────────────────────┴─────────────────────────────┤
│ 01 Instruments · browse/filter · expand all                          │
├──────────────────────────────────────────┬──────────────────────────┤
│ IDENTITY   [peek-through specimen]        │ PERSONA [split specimen] │
│ question / design / current evidence     │ context / annotation      │
│ [unfold inline: method, record, limits]   │ [unfold inline]           │
├────────────────────────────┬─────────────┴──────────────────────────┤
│ AUTHORITY [handoff visual]  │ BEARING [claim-graph specimen]         │
├────────────────────────────┴────────────────────────────────────────┤
│ 02 The record / live releases / source hash / citation / direct view│
├────────────────────────────────────┬────────────────────────────────┤
│ 03 Methods: provenance / ethics    │ 04 Analysis / HF / Press / Agent│
└────────────────────────────────────┴────────────────────────────────┘
```

## Interaction score

- Hover or keyboard focus uncovers a visual and activates a nested colored breadcrumb. Touch gets a visible specimen and the same native disclosure control.
- The card summary opens the full brief in the same grid, with source/instrument links one step away. Multiple briefs may stay open for comparison. No modal, nested scroll trap or hover-only content.
- A bounded entrance/scroll settle and a 220ms aperture movement; reduced motion retains all content without movement. No continuous autoplay, video downloads or new animation dependency.
- Direct fragment links open the matching brief. A compact search filters only instruments and offers an explicit empty state; it does not hide evidence or methods.
- Evidence is actual live registry metadata. Original SVG specimens illustrate methods and are labeled non-data. No invented counts, plots, trials or confidence scores.
- Status, method and limits remain visible in the collapsed card; evidence and methods have readable summaries on the landing, with optional depth and real source links.

## Acceptance / risks

Inspect actual rendered desktop and 320/390px layouts, keyboard disclosure/focus, hover aperture geometry, filters, multiple open briefs, fragment entry and reduced motion. Preserve strict CSP, local fonts, live registry failure/retry and authentication. Rebuild staged assets, check the upload manifest and verify production bytes after shipping. Native disclosures and links remain useful without JavaScript. Restore normal browser settings after responsive tests.
