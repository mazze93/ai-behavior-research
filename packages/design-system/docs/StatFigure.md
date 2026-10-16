# StatFigure

For when the form is a number: one value with its interval, n, provenance, and optionally a delta and a sparkline.

**Use** `size="hero"` for the single lead number of a view and `tile` for the rest. Set `value: null` for a measure that hasn't run: it reads "Not run" and is never shown as 0.

**The consumer provides**
- `label` (sentence case) and `value`.
- Optional: `format`, `interval` and `intervalLabel`, `n`, `delta { value, against, format? }` and `trend` (oldest first).
- `provenance`.

The delta states direction with a sign and an arrow, in ink. It is never colored good or bad. The value is set in Manrope, never the poster serif.
