# TrendChart

Shows change over time or over rounds: 2px lines, end markers, and a crosshair that reads every series at one x position.

**Use it** for counts per week, rates per round, or anything else with an ordered x axis. One series gets a 10% area wash. Points that carry `low`/`high` can draw an interval band (`band`); bands read best on a single series.

**The consumer provides**
- `series`: `{ key, label, points: { x: number | ISO date, y | null, low?, high? }[] }[]`, at most five in declared order. `null` leaves a gap; it is never drawn as zero.
- `yLabel` and `provenance` / `source`.
- Optional: `format`, `xFormat`, `height`, and `zero` (the y axis starts at 0 by default).

End labels appear for up to four series when they don't collide; otherwise the legend and tooltip carry identity. Appended points grow from their series' previous value. Left/right arrow keys move the crosshair. There is never a second y axis: two measures means two charts.
