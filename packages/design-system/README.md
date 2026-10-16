# Charcoal / Porcelain components

Builds the Charcoal / Porcelain design system's live components into one classic script, `window.CharcoalPorcelain`, for the design-system artifact and any static page.

- `src/shell/`: Masthead, Button, TextLink, StudyRow, ReleaseCard, Field, Notice (React forms of the landing and hub styles).
- `src/viz/`: the data-visualization units. IntervalPlot, StripPlot, TrendChart, MatrixHeatmap, ProportionBars, StatFigure and EvidenceLedger share `core.tsx`: the Figure frame, table twin, scales, tweening and tooltips.
- `src/index.ts` also bundles the landing's own `SpectralFold` and `StudyRoom` from `apps/landing/src/components/`, so the illustration keeps one source.
- `src/styles.css` → `bundle.css`. Colors and sizes are tokens (`--ink`, `--data-1` …) declared by the system's `tokens.css`.

```bash
npm ci
npm run check          # strict TypeScript, including the landing islands
npm run build          # dist/bundle.js, bundle.css, index.d.ts, previews/<Component>/preview.html
node previews/extract.mjs [path/to/authority-without-assertion]   # refresh preview fixtures
```

React and ReactDOM are not bundled. The build maps `react`, `react-dom` and `react/jsx-runtime` to `window.React` / `window.ReactDOM` (React 18 or later).

Preview fixtures in `previews/data/` are extracted from real study files, and each records its source revision. The Identity Dissolution example is a synthetic machinery check and is labelled that way. Any preview that generates numbers labels its figure an illustration.

Chart color rules: series take `--data-1…5` in declared order (validated per theme for lightness band, chroma, CVD and normal-vision separation, and 3:1 contrast). Magnitude takes `--data-seq-1…5`; signed values take `--data-div-*`. Color never encodes validity: status, missing values and unrun checks are shown in words, hatch and fill.
