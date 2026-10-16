# ProportionBars

Shows part-to-whole for each row (outcome mix by condition, rating distribution by item) as 100% stacked bars with 2px surface gaps.

**Use** `ordinal` when the categories have an order (severity, a decision sequence, Likert scales); they then take the one-hue ramp. Use the categorical slots for nominal categories. A share label appears inside a segment only when it fits; counts are always in the tooltip and table.

**The consumer provides**
- `rows`: `{ id, label, counts: Record<categoryKey, number>, total? }[]`
- `categories`: `{ key, label }[]` in left-to-right order
- `provenance` / `source`

Don't use it for fewer than three rows of comparison. A single row is a StatFigure.
