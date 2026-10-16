# Research landing

Static Astro 7 composition, strict TypeScript, one React `client:idle` island.
The existing registry Worker owns Cloudflare routing, authentication and
security headers. There is no second server adapter or new backend.

From the repository root:

```sh
make install
make landing
make registry-dev
```

`make landing` builds into ignored `dist/`, then stages only manifest-listed
HTML, CSS, JavaScript, WOFF2 and license files into `apps/registry/public`.
Inline Astro hydration bootstrap and font styles become same-origin assets;
the current CSP remains intact. The deployment guard checks source fingerprints
and all public asset hashes, and refuses a stale or modified landing build.
Generated public files are committed for reproducible Worker deployment.

Fonts are local OFL-1.1 packages (Bodoni Moda and Manrope). The local font
provider, lockfile, public provenance JSON and included licenses retain their
origins. No font API or CDN is contacted at runtime. Roslindale and Graphik are
design references; these are disclosed approximations. Basteleur remains only
in the earlier Authority/Bearing guide.

The sculpture is complete SVG before hydration. Its finite interaction can be
operated with a pointer, keyboard, or touch; reduced motion changes orientation
instantly. The shell and illustration work when served locally without external
network access. The live release list requires the registry API and has an
explicit unavailable state. No service worker caches private research.

The React integration's Vite React plugin is pinned to 6.1.1: its optional
compiler peer matches oxc-transform-react 0.145.0 required by the integration.
The next plugin patch requires an incompatible optional compiler peer. Fresh
`npm ci --ignore-scripts`, build and audit were checked with this resolved graph.
