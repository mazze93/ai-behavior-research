# MatrixHeatmap

Shows a grid of values on a five-step ramp: agreement between rating rounds, motif × platform counts, or condition × outcome tables.

**Use** `scale="sequential"` (one indigo hue) for magnitude. Use `scale="diverging"` (rust ↔ teal around a gray midpoint at `center`) for signed values. Cell labels pick charcoal or porcelain ink by the fill's luminance, in either theme.

**The consumer provides**
- `rows`, `columns`, and `values[r][c]` (a number, or `null` for no record).
- `valueLabel`, `missingLabel` (e.g. "Not run") and `provenance` / `source`.
- Optional: `rowLabel` / `columnLabel`, `domain`, and `format`.

Missing cells use the 135° hatch from the evidence explorer and are labelled in words in the legend and table. An unrun check is never drawn as zero. Column labels rotate only when they don't fit.
