# A room with two doors — navigation guide

Deployable extension of the existing Astro / React landing. Designed before implementation, 25 October 2026.

## Bounded inspiration

The supplied 96.84-second local recording shows klassegrafik.de: independent tabbed columns, hairline rules, accordion lists and a detail surface that opens between narrow peripheral rails. Frames at 8, 32, 56 and 81 seconds were inspected locally. The recording and extracted frames are not publication assets. A bounded three-result search confirmed the primary reference: https://klassegrafik.de/ and https://klassegrafik.de/en/klasse. Its principle of questioning, ordering and dialogue fits this project; no text or artwork is copied.

## Translation into research

Tone: an editorial reading room, precise and tactile. Retain the existing self-hosted Bodoni Moda / Manrope pairing and porcelain / charcoal palette. The memorable action is opening an index entry into a chromatic reading surface, with an index rail always available to return. Color marks selection, never scientific confidence.

```
┌ Research index                         Close × ┐
│ Studies | Tools     │ Methods | Evidence | Links│
│ 01 Identity         │ Research standards        │
│ 02 Persona          │ Ethics / Method audit     │
│                     │                          │
├ Open an entry ──────┴──────────────────────────┤
│ ← Return to index │ LARGE READING SURFACE       │
│                   │ status, method, limits     │
│                   │ real destination link ↗   │
└───────────────────┴───────────────────────────┘
```

A native modal dialog contains two independent scrollable lists. Each side uses ordinary pressed buttons for category selection, preserving the other side's category and scroll position. A selected entry opens a detail surface; returning restores the index rather than navigating away. Destination links enter the existing real instrument, evidence gallery or methodology page. No embedded private pages, fabricated findings, model requests or new backend.

## Acceptance

- Native dialog focus containment, Escape dismissal and return to its opener.
- Explicit close and return controls, semantic headings, visible focus, 44-pixel targets.
- All category and entry controls work by keyboard and touch. Narrow layouts stack panels with bounded independent scrolling; detail remains readable.
- No motion required; reduced-motion preference removes transitions.
- Working links remain available in server-rendered lists if JavaScript fails; the opener falls back to that directory.
- Existing source-exact deployment checks, strict CSP, authentication, release hashes and local-font delivery remain in force.

## Deliberate bounds

Authority Without Assertion and Bearing remain in development and are described as such. Links to their canonical sources must not imply functional hosted instruments. Press and Hugging Face are external destinations, clearly labeled. Opening the index never performs inference or publishes evidence.
