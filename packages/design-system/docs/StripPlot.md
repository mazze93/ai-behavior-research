# StripPlot

Shows every observation instead of only a summary: one row per condition, one dot per run, and the row mean marked with an ink tick.

**Use it** for per-run metrics where small n makes a mean misleading on its own (the `metrics.csv` of an Identity Dissolution run).

**The consumer provides**
- `points`: `{ id, group, value, series?, detail? }[]`. `detail` appears in the tooltip, e.g. "seed 33 · run-00000.json".
- `groups` (row order), `series` (fixed color order), `xLabel` and `provenance` / `source`.
- Optional: `format`, `domain`, and `showMean`.

Jitter is deterministic per `id`, so dots don't move between renders. When a series is filtered out, the remaining series keep their colors.
