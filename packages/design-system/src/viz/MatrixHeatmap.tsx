import { useId, useRef, useState, type KeyboardEvent } from 'react';
import {
  DIV_STEPS, DataTable, Figure, Tooltip, compact, seqColor, textWidth, useOnFillText, useWidth,
  type Format, type Provenance, type TipState,
} from './core';

export interface MatrixHeatmapProps {
  title: string;
  kicker?: string;
  provenance: Provenance;
  source?: string;
  note?: string;
  rows: string[];
  columns: string[];
  /** values[r][c]; null = no record (drawn hatched, labelled in the table). */
  values: (number | null)[][];
  /** 'sequential' for magnitude (counts, agreement); 'diverging' for signed values around `center`. */
  scale?: 'sequential' | 'diverging';
  domain?: [number, number];
  center?: number;
  format?: Format;
  rowLabel?: string;
  columnLabel?: string;
  valueLabel: string;
  /** What a missing cell means, in words. */
  missingLabel?: string;
  /** Print values inside cells when they fit. Default true. */
  labels?: boolean;
}

const GAP = 2;

/** A grid of values on a five-step ramp: agreement between raters, motif × platform counts, condition × outcome tables. */
export function MatrixHeatmap({ title, kicker, provenance, source, note, rows, columns, values, scale = 'sequential', domain, center = 0,
  format = compact, rowLabel = '', columnLabel = '', valueLabel, missingLabel = 'No record', labels = true }: MatrixHeatmapProps) {
  const [wrap, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<[number, number] | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const hatch = useId().replace(/:/g, '');
  const flat = values.flat().filter((v): v is number => v !== null);
  const [lo, hi] = domain ?? (scale === 'diverging'
    ? (() => { const m = Math.max(...flat.map(v => Math.abs(v - center)), 1e-9); return [center - m, center + m] as [number, number]; })()
    : [Math.min(0, ...flat), Math.max(...flat, 1e-9)] as [number, number]);

  const step = (v: number) => {
    if (scale === 'diverging') {
      const t = (v - center) / (Math.max(hi - center, center - lo) || 1);
      return Math.abs(t) < 0.2 ? 2 : t < 0 ? (t < -0.6 ? 0 : 1) : (t > 0.6 ? 4 : 3);
    }
    return Math.min(4, Math.max(0, Math.floor(((v - lo) / ((hi - lo) || 1)) * 5)));
  };
  const color = (v: number) => scale === 'diverging' ? `var(--${DIV_STEPS[step(v)]})` : seqColor(step(v) + 1);

  const labelW = Math.min(180, Math.max(90, ...rows.map(r => textWidth(r, 12) + 16)));
  const cell = Math.max(24, Math.min(88, Math.floor((width - labelW) / Math.max(1, columns.length))));
  // Column labels rotate only when one would not fit its cell; the header grows to hold them.
  const rotate = columns.some(c => textWidth(c, 11) > cell - 8);
  const headH = (rotate ? Math.min(150, Math.max(...columns.map(c => textWidth(c, 11))) * 0.66 + 16) : 22) + (columnLabel ? 24 : 0) + (rowLabel && !columnLabel ? 18 : 0);
  const gridW = cell * columns.length, gridH = cell * rows.length;
  useOnFillText(svg, [values, width, scale]);

  const onKey = (e: KeyboardEvent) => {
    const [r, c] = active ?? [0, -1];
    const mv: Record<string, [number, number]> = { ArrowRight: [r, c + 1], ArrowLeft: [r, c - 1], ArrowDown: [r + 1, Math.max(c, 0)], ArrowUp: [r - 1, Math.max(c, 0)] };
    const n = mv[e.key];
    if (n) { e.preventDefault(); setActive([Math.max(0, Math.min(rows.length - 1, n[0])), Math.max(0, Math.min(columns.length - 1, n[1]))]); }
    if (e.key === 'Escape') setActive(null);
  };
  const tip: TipState | null = active ? (() => {
    const v = values[active[0]]?.[active[1]] ?? null;
    return { x: labelW + active[1] * cell + cell / 2, y: headH + active[0] * cell, title: `${rows[active[0]]} × ${columns[active[1]]}`,
      lines: [{ label: valueLabel, value: v === null ? missingLabel : format(v) }] };
  })() : null;

  const steps = scale === 'diverging' ? DIV_STEPS.map(s => `var(--${s})`) : [1, 2, 3, 4, 5].map(seqColor);
  const table = <DataTable caption={`${title} — ${valueLabel}`} rows={rows.map((r, i) => ({ r, i }))} columns={[
    { key: 'r', label: rowLabel || 'Row', value: x => x.r },
    ...columns.map((c, ci) => ({ key: `c${ci}`, label: c, align: 'right' as const, value: (x: { i: number }) => { const v = values[x.i]?.[ci]; return v === null || v === undefined ? missingLabel : format(v); } })),
  ]} />;

  const legend = <div className="cp-scale" aria-label={`${valueLabel} scale`}>
    <span>{format(lo)}</span>
    <span className="cp-scale-steps">{steps.map((s, i) => <i key={i} style={{ background: s }} />)}</span>
    <span>{format(hi)}</span>
    {scale === 'diverging' && <span className="cp-scale-mid">mid {format(center)}</span>}
    {flat.length < values.flat().length && <span className="cp-scale-missing"><i className="cp-hatch-key" />{missingLabel}</span>}
  </div>;

  return <Figure title={title} kicker={kicker} provenance={provenance} source={source} note={note} table={table} legend={legend}>
    <div ref={wrap} className="cp-plot" onPointerLeave={() => setActive(null)}>
      <svg ref={svg} width={Math.max(width, labelW + gridW)} height={headH + gridH + 8} role="img" tabIndex={0} onKeyDown={onKey} onBlur={() => setActive(null)}
        aria-label={`${title}. ${rows.length} by ${columns.length} grid of ${valueLabel}. Arrow keys move between cells; the table view lists every value.`}>
        <defs>
          <pattern id={`h${hatch}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
            <rect width="8" height="8" className="cp-hatch-bg" /><rect width="3" height="8" className="cp-hatch-ink" />
          </pattern>
        </defs>
        {columnLabel && <text className="cp-axis-title" x={labelW} y={12}>{columnLabel} →</text>}
        {rowLabel && <text className="cp-axis-title" x={labelW - 10} y={headH - 8} textAnchor="end">{rowLabel} ↓</text>}
        {columns.map((c, ci) => <text key={c} className="cp-col-label" transform={`translate(${labelW + ci * cell + cell / 2},${headH - 8}) rotate(${rotate ? -40 : 0})`}
          textAnchor={rotate ? 'start' : 'middle'}>{c}</text>)}
        {rows.map((r, ri) => <g key={r}>
          <text className="cp-row-label" x={labelW - 10} y={headH + ri * cell + cell / 2 + 4} textAnchor="end">{r}</text>
          {columns.map((c, ci) => {
            const v = values[ri]?.[ci] ?? null, id = `${ri}-${ci}`;
            const on = active?.[0] === ri && active?.[1] === ci;
            const cx = labelW + ci * cell, cy = headH + ri * cell;
            const text = v === null ? '' : format(v);
            return <g key={c} onPointerEnter={() => setActive([ri, ci])}>
              <rect className="cp-cell" data-fill={v === null ? undefined : id} data-active={on} x={cx + GAP / 2} y={cy + GAP / 2} width={cell - GAP} height={cell - GAP}
                style={{ fill: v === null ? `url(#h${hatch})` : color(v) }} />
              {labels && v !== null && textWidth(text, 11) + 10 < cell &&
                <text className="cp-cell-label" data-on={id} x={cx + cell / 2} y={cy + cell / 2 + 4} textAnchor="middle">{text}</text>}
            </g>;
          })}
        </g>)}
      </svg>
      <Tooltip tip={tip} width={width} />
    </div>
  </Figure>;
}
