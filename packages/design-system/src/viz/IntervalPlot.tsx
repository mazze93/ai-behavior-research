import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  textWidth, DataTable, Figure, Legend, Tooltip, XAxis, compact, linear, niceDomain, niceTicks, seriesColor, slotMap,
  useTweenMap, useWidth, type Format, type Provenance, type SeriesDef, type TipState,
} from './core';

export interface IntervalRow {
  id: string;
  /** Row label, e.g. the contrast "original − neutral". */
  label: string;
  /** Rows sharing a group are set under one record heading (e.g. the model). */
  group?: string;
  /** Series key (for color identity) — usually the model or condition. */
  series?: string;
  estimate: number;
  low: number;
  high: number;
  n?: number;
  /** An interval that collapses or is censored is flagged in words. */
  flag?: string;
}

export interface IntervalPlotProps {
  title: string;
  kicker?: string;
  provenance: Provenance;
  source?: string;
  note?: string;
  rows: IntervalRow[];
  series?: SeriesDef[];
  /** Reference line, usually 0 (no difference). */
  reference?: number;
  referenceLabel?: string;
  xLabel: string;
  intervalLabel?: string;
  format?: Format;
  domain?: [number, number];
}

const ROW = 30, GROUP = 30, PAD_TOP = 8, AXIS = 40;

/** Estimates with uncertainty intervals against a reference: paired differences, contrasts, rates between conditions. */
export function IntervalPlot({ title, kicker, provenance, source, note, rows, series, reference = 0, referenceLabel = 'No difference',
  xLabel, intervalLabel = '95% interval', format = compact, domain }: IntervalPlotProps) {
  const [wrap, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const slots = slotMap(series);
  const labelW = Math.min(width * 0.42, Math.max(100, ...rows.map(r => textWidth(r.label, 12) + 24))), valueW = 72;
  const x0 = labelW, x1 = Math.max(x0 + 80, width - valueW);

  const layout = useMemo(() => {
    let y = PAD_TOP; let last: string | undefined;
    return rows.map(r => {
      const head = r.group !== undefined && r.group !== last;
      if (head) y += GROUP;
      last = r.group;
      const out = { row: r, y: y + ROW / 2, head };
      y += ROW;
      return out;
    });
  }, [rows]);
  const plotH = (layout.at(-1)?.y ?? 0) + ROW / 2 + 6;

  const dom = domain ?? niceDomain(rows.flatMap(r => [r.low, r.high]), [reference], 0.04);
  const x = linear(dom, [x0, x1]);
  const ticks = niceTicks(dom[0], dom[1], Math.max(2, Math.floor((x1 - x0) / 90)));
  const tween = useTweenMap(Object.fromEntries(rows.map(r => [r.id, [r.estimate, r.low, r.high]])), v => [reference, reference, reference]);

  const tipFor = (i: number): TipState | null => {
    const l = layout[i]; if (!l) return null;
    const r = l.row;
    return { x: x(r.estimate), y: l.y, title: [r.group, r.label].filter(Boolean).join(' / '), lines: [
      { label: 'Estimate', value: format(r.estimate) },
      { label: intervalLabel, value: `${format(r.low)} to ${format(r.high)}` },
      ...(r.n !== undefined ? [{ label: 'n', value: String(r.n) }] : []),
      ...(r.flag ? [{ label: 'Note', value: r.flag }] : []),
    ] };
  };
  const onKey = (e: KeyboardEvent) => {
    if (!rows.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); setActive(a => a === null ? 0 : Math.min(rows.length - 1, a + 1)); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); setActive(a => a === null ? 0 : Math.max(0, a - 1)); }
    if (e.key === 'Escape') setActive(null);
  };

  const legendItems = (series ?? []).map((s, i) => ({ key: s.key, label: s.label, color: seriesColor(i) }));
  const table = <DataTable caption={title} rows={rows} columns={[
    ...(rows.some(r => r.group) ? [{ key: 'g', label: 'Group', value: (r: IntervalRow) => r.group }] : []),
    { key: 'l', label: 'Row', value: r => r.label },
    { key: 'e', label: 'Estimate', align: 'right', value: r => format(r.estimate) },
    { key: 'lo', label: 'Low', align: 'right', value: r => format(r.low) },
    { key: 'hi', label: 'High', align: 'right', value: r => format(r.high) },
    { key: 'n', label: 'n', align: 'right', value: r => r.n },
    { key: 'f', label: 'Note', value: r => r.flag },
  ]} />;

  return <Figure title={title} kicker={kicker} provenance={provenance} source={source} note={note} table={table}
    legend={<Legend items={legendItems} />}>
    <div ref={wrap} className="cp-plot" onPointerLeave={() => setActive(null)}>
      <svg ref={svg} width={width} height={plotH + AXIS} role="img" tabIndex={0} onKeyDown={onKey} onBlur={() => setActive(null)}
        aria-label={`${title}. ${rows.length} estimates with ${intervalLabel}s against ${referenceLabel.toLowerCase()} at ${format(reference)}. Use arrow keys to step through rows; the table view lists every value.`}>
        <XAxis ticks={ticks} x={x} y={plotH} format={format} height={plotH} />
        <line className="cp-reference" x1={x(reference)} x2={x(reference)} y1={0} y2={plotH} />
        <text className="cp-axis-note" x={x(reference) + 6} y={plotH + 32}>{referenceLabel}</text>
        <text className="cp-axis-title" x={x1} y={plotH + 32} textAnchor="end">{xLabel}</text>
        {layout.map((l, i) => {
          const r = l.row, [est, lo, hi] = tween[r.id] ?? [r.estimate, r.low, r.high];
          const color = r.series !== undefined && slots.has(r.series) ? seriesColor(slots.get(r.series)!) : 'var(--ink)';
          const on = active === i;
          return <g key={r.id} className="cp-row" data-active={on} onPointerEnter={() => setActive(i)}>
            {l.head && <text className="cp-group-label" x={0} y={l.y - ROW / 2 - 8}>{r.group}</text>}
            <rect className="cp-hit" x={0} y={l.y - ROW / 2} width={width} height={ROW} />
            <text className="cp-row-label" x={x0 - 14} y={l.y + 4} textAnchor="end">{r.label}</text>
            <line className="cp-interval" x1={x(lo!)} x2={x(hi!)} y1={l.y} y2={l.y} style={{ stroke: color }} />
            {Math.abs(x(hi!) - x(lo!)) < 1 && <line className="cp-interval-cap" x1={x(est!)} x2={x(est!)} y1={l.y - 6} y2={l.y + 6} style={{ stroke: color }} />}
            <circle className="cp-dot" cx={x(est!)} cy={l.y} r={on ? 6 : 5} style={{ fill: color }} />
            <text className="cp-row-value" x={width - 2} y={l.y + 4} textAnchor="end">{format(r.estimate)}{r.flag ? ' *' : ''}</text>
          </g>;
        })}
      </svg>
      <Tooltip tip={active === null ? null : tipFor(active)} width={width} />
    </div>
  </Figure>;
}
