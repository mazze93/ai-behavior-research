import { useRef, useState, type KeyboardEvent } from 'react';
import {
  DataTable, Figure, Legend, Tooltip, linear, percent, seqColor, seriesColor, textWidth, useOnFillText,
  useTweenMap, useWidth, type Provenance, type SeriesDef, type TipState,
} from './core';

export interface ProportionRow {
  id: string;
  label: string;
  /** Counts per category key; shares are computed from these. */
  counts: Record<string, number>;
  /** Shown in the right column, e.g. "18 eligible". Defaults to the total. */
  total?: string;
}

export interface ProportionBarsProps {
  title: string;
  kicker?: string;
  provenance: Provenance;
  source?: string;
  note?: string;
  rows: ProportionRow[];
  /** Category order, left to right. */
  categories: SeriesDef[];
  /** Ordered categories (severity, Likert) take the one-hue ramp; nominal ones take the categorical slots. */
  ordinal?: boolean;
}

const BAR = 24, ROW = 46, GAP = 2;

/** Part-to-whole per row: outcome mix by condition, rating distribution by item. Shares sum to 100%; counts stay in the table. */
export function ProportionBars({ title, kicker, provenance, source, note, rows, categories, ordinal = false }: ProportionBarsProps) {
  const [wrap, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<[number, number] | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const color = (i: number) => ordinal ? seqColor(Math.round(1 + (i * 4) / Math.max(1, categories.length - 1))) : seriesColor(i);
  const labelW = Math.min(200, Math.max(110, width * 0.24)), totalW = 96;
  const x0 = labelW, x1 = Math.max(x0 + 80, width - totalW);
  const x = linear([0, 1], [x0, x1]);
  const totals = rows.map(r => categories.reduce((a, c) => a + (r.counts[c.key] ?? 0), 0));
  const shares = rows.map((r, i) => categories.map(c => totals[i] ? (r.counts[c.key] ?? 0) / totals[i]! : 0));
  const tw = useTweenMap(Object.fromEntries(rows.map((r, i) => [r.id, shares[i]!])), v => v.map(() => 0));
  useOnFillText(svg, [rows, width]);

  const tip: TipState | null = active ? (() => {
    const [ri, ci] = active, r = rows[ri]!, c = categories[ci]!;
    let start = 0; for (let k = 0; k < ci; k++) start += shares[ri]![k]!;
    return { x: x(start + shares[ri]![ci]! / 2), y: 8 + ri * ROW, title: r.label, lines: [
      { color: color(ci), label: c.label, value: `${percent(shares[ri]![ci]!)} (${r.counts[c.key] ?? 0} of ${totals[ri]})` }] };
  })() : null;
  const onKey = (e: KeyboardEvent) => {
    const [r, c] = active ?? [0, -1];
    const n: Record<string, [number, number]> = { ArrowRight: [r, c + 1], ArrowLeft: [r, c - 1], ArrowDown: [r + 1, Math.max(0, c)], ArrowUp: [r - 1, Math.max(0, c)] };
    const m = n[e.key]; if (m) { e.preventDefault(); setActive([Math.max(0, Math.min(rows.length - 1, m[0])), Math.max(0, Math.min(categories.length - 1, m[1]))]); }
    if (e.key === 'Escape') setActive(null);
  };

  const table = <DataTable caption={title} rows={rows.map((r, i) => ({ r, i }))} columns={[
    { key: 'l', label: 'Row', value: d => d.r.label },
    ...categories.map((c, ci) => ({ key: c.key, label: c.label, align: 'right' as const, value: (d: { r: ProportionRow; i: number }) => `${d.r.counts[c.key] ?? 0} (${percent(shares[d.i]![ci]!)})` })),
    { key: 't', label: 'Total', align: 'right', value: d => d.r.total ?? totals[d.i] },
  ]} />;

  return <Figure title={title} kicker={kicker} provenance={provenance} source={source} note={note} table={table}
    legend={<Legend kind="block" items={categories.map((c, i) => ({ key: c.key, label: c.label, color: color(i) }))} />}>
    <div ref={wrap} className="cp-plot" onPointerLeave={() => setActive(null)}>
      <svg ref={svg} width={width} height={rows.length * ROW + 24} role="img" tabIndex={0} onKeyDown={onKey} onBlur={() => setActive(null)}
        aria-label={`${title}. ${rows.length} rows, each split into ${categories.length} categories. Arrow keys move between segments; the table view lists counts.`}>
        {[0, .25, .5, .75, 1].map(t => <g key={t} className="cp-axis" aria-hidden="true">
          <line className="cp-grid" x1={x(t)} x2={x(t)} y1={0} y2={rows.length * ROW} />
          <text x={x(t)} y={rows.length * ROW + 16} textAnchor="middle">{percent(t)}</text>
        </g>)}
        {rows.map((r, ri) => {
          const cy = ri * ROW + (ROW - BAR) / 2;
          const sh = tw[r.id] ?? shares[ri]!;
          let acc = 0;
          return <g key={r.id}>
            <text className="cp-row-label" x={x0 - 14} y={cy + BAR / 2 + 4} textAnchor="end">{r.label}</text>
            {categories.map((c, ci) => {
              const s = sh[ci] ?? 0, a = x(acc), w = Math.max(0, x(acc + s) - a - (ci < categories.length - 1 ? GAP : 0));
              acc += s;
              if (w <= 0.5) return null;
              const id = `${ri}-${ci}`, txt = percent(shares[ri]![ci]!), last = categories.slice(ci + 1).every((_, k) => (sh[ci + 1 + k] ?? 0) === 0);
              const on = active?.[0] === ri && active?.[1] === ci;
              return <g key={c.key} onPointerEnter={() => setActive([ri, ci])}>
                <path className="cp-seg" data-fill={id} data-active={on} style={{ fill: color(ci) }}
                  d={last ? `M${a},${cy}h${Math.max(0, w - 4)}a4,4 0 0 1 4,4v${BAR - 8}a4,4 0 0 1 -4,4h${-Math.max(0, w - 4)}Z` : `M${a},${cy}h${w}v${BAR}h${-w}Z`} />
                {textWidth(txt, 11) + 12 < w && <text className="cp-seg-label" data-on={id} x={a + w / 2} y={cy + BAR / 2 + 4} textAnchor="middle">{txt}</text>}
              </g>;
            })}
            <text className="cp-row-value" x={width - 2} y={cy + BAR / 2 + 4} textAnchor="end">{r.total ?? `n = ${totals[ri]}`}</text>
          </g>;
        })}
      </svg>
      <Tooltip tip={tip} width={width} />
    </div>
  </Figure>;
}
