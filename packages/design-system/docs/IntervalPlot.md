# IntervalPlot

Shows estimates with uncertainty intervals against a reference line, such as paired mean differences, contrasts between conditions, or rates with confidence intervals.

**Use it** when the question is "how big is the difference, and how sure are we?" Rows group under record headings (for example, by model). Each row is a 2px interval in its series color with an 8px dot and a surface ring. The reference line is solid ink.

**The consumer provides**
- `rows`: `{ id, label, group?, series?, estimate, low, high, n?, flag? }[]`. Keep `id` stable: when data changes, rows tween from where they are.
- `series` in a fixed order, which assigns color slots. The order never depends on rank.
- `provenance`: `'recorded' | 'synthetic' | 'illustrative' | 'fixture' | 'unrun'`, plus `source` (path, release or hash).
- `xLabel`, `intervalLabel` (say what kind of interval it is), and optionally `reference` / `referenceLabel`, `format` and `domain`.

**Do**
- Name the interval honestly ("Exploratory bootstrap 95% interval").
- Use `flag` to say in words when an interval collapses or is censored.

**Don't**
- Color a row by significance.
- Hide `n`.
- Drop rows that cross the reference.

Keyboard: focus the plot, then use the arrow keys to step through rows. The **Table** view lists every value.
