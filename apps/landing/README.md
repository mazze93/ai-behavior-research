# Research landing

Static Astro 7 composition with strict TypeScript and native HTML disclosures.
The registry Worker owns routing, authentication and security headers. The
current cabinet landing mounts no React islands and adds no dependencies.
Earlier React illustration/index components remain in source as previous designs;
they are not part of the current landing's client bundle.

From the repository root:

```sh
make install
make landing
make registry-dev
```

`make landing` checks and builds the page, then stages only manifest-listed
HTML, CSS, JavaScript, WOFF2 and license files into `apps/registry/public`.
Astro's inline font styles become same-origin assets; the existing CSP remains
intact. The deployment guard checks source fingerprints, including the existing
Basteleur font/license used by the local font provider, and every staged asset.
Generated public files are committed. Restart a local registry preview after a
rebuild so Wrangler indexes the newly hashed asset names.

Fonts are self-hosted Basteleur Bold, Manrope and Bodoni Moda. Astro's local
font provider preloads them without runtime font APIs or external stylesheets.
The existing Basteleur OFL license and source record are retained; Fontsource
package versions, provenance and OFL licenses accompany the other two families.

The cabinet puts all four instrument briefs directly on the landing. Native
`details` controls work with keyboard, touch and JavaScript disabled. Multiple
briefs can stay open. Small TypeScript modules add instrument filtering,
search, expansion controls, direct fragment entry, breadcrumb context and a
bounded scroll entrance. Opening one brief settles it below the breadcrumb bar;
collective expansion leaves the reading position alone. Hover/focus/open states uncover original SVG method
specimens, explicitly labeled non-data. Reduced motion disables transitions
and animations without removing content. No modal or internal scroll panels
are mounted.

The live release list uses the same-origin registry and has an unavailable/retry
state. Source hashes, citations, raw-bundle links and citation copying are on the
landing. Copying requires a clipboard-capable secure context; failure directs
the reader to the visible citation. The page does not run inference or publish
records. No service worker caches private research.

See `docs/research-hub/cabinet-visual-guide-2026-10-25.md` for the reference study,
composition and acceptance criteria. Existing React dependency pins are retained
for the preserved components; no framework migration was introduced.
