import { useMemo, useState, type KeyboardEvent } from 'react';
import {
  textWidth, DataTable, Figure, Legend, Tooltip, XAxis, compact, hash01, linear, niceDomain, niceTicks, seriesColor, slotMap,
  useTweenMap, useWidth, type Format, type Provenance, type SeriesDef, type TipState,
} from './core';

export interface StripPoint {
  id: string;
  /** Row category, e.g. the prompt condition. */
  group: string;
  value: number;
  /** Series key for color identity, e.g. the model. */
  series?: string;
  /** Shown in the tooltip, e.g. "seed 33 · run-00000.json". */
  detail?: string;
}

export interface StripPlotProps {
  title: string;
  kicker?: string;
  provenance: Provenance;
  source?: string;
  note?: string;
  points: StripPoint[];
  /** Row order; defaults to first appearance. */
  groups?: string[];
  series?: SeriesDef[];
  xLabel: string;
  format?: Format;
  domain?: [number, number];
  /** Draw the per-row mean as an ink tick with its value. Default true. */
  showMean?: boolean;
}

const BAND = 44, AXIS = 40;

/** Every observation, not just a summary: one row per condition, one dot per run, the mean marked in ink. */
export function StripPlot({ title, kicker, provenance, source, note, points, groups, series, xLabel, format = compact, domain, showMean = true }: StripPlotProps) {
  const [wrap, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<string | null>(null);
  const slots = slotMap(series);
  const rowsOrder = useMemo(() => groups ?? [...new Set(points.map(p => p.group))], [groups, points]);
  const labelW = Math.min(width * 0.4, Math.max(90, ...rowsOrder.map(g => textWidth(g, 12) + 24))), valueW = 64;
  const x0 = labelW, x1 = Math.max(x0 + 80, width - valueW);
  const plotH = rowsOrder.length * BAND;
  const dom = domain ?? niceDomain(points.map(p => p.value), [], 0.04);
  const x = linear(dom, [x0, x1]);
  const ticks = niceTicks(dom[0], dom[1], Math.max(2, Math.floor((x1 - x0) / 90)));
  const rowY = (g: string) => rowsOrder.indexOf(g) * BAND + BAND / 2;
  const means = useMemo(() => Object.fromEntries(rowsOrder.map(g => {
    const vs = points.filter(p => p.group === g).map(p => p.value);
    return [g, vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : NaN];
  })), [rowsOrder, points]);

  const tween = useTweenMap(Object.fromEntries(points.map(p => [p.id, [p.value]])), v => [dom[0]]);
  const meanTween = useTweenMap(Object.fromEntries(rowsOrder.filter(g => isFinite(means[g]!)).map(g => [g, [means[g]!]])));

  const order = points.map(p => p.id);
  const activePoint = points.find(p => p.id === active);
  const tip: TipState | null = activePoint ? {
    x: x(activePoint.value), y: rowY(activePoint.group), title: activePoint.group,
    lines: [
      ...(activePoint.series ? [{ key: 's', color: seriesColor(slots.get(activePoint.series) ?? 0), label: series?.find(s => s.key === activePoint.series)?.label ?? activePoint.series, value: format(activePoint.value) }] : [{ label: 'Value', value: format(activePoint.value) }]),
      ...(activePoint.detail ? [{ label: 'Record', value: activePoint.detail }] : []),
    ],
  } : null;
  const onKey = (e: KeyboardEvent) => {
    const i = active ? order.indexOf(active) : -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setActive(order[Math.min(order.length - 1, i + 1)] ?? null); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setActive(order[Math.max(0, i - 1)] ?? null); }
    if (e.key === 'Escape') setActive(null);
  };

  const table = <DataTable caption={title} rows={points} columns={[
    { key: 'g', label: 'Group', value: p => p.group },
    ...(series ? [{ key: 's', label: 'Series', value: (p: StripPoint) => series.find(s => s.key === p.series)?.label ?? p.series }] : []),
    { key: 'v', label: xLabel, align: 'right', value: p => format(p.value) },
    { key: 'd', label: 'Record', value: p => p.detail },
  ]} />;

  return <Figure title={title} kicker={kicker} provenance={provenance} source={source} note={note} table={table}
    legend={<Legend items={(series ?? []).map((s, i) => ({ key: s.key, label: s.label, color: seriesColor(i) }))} />}>
    <div ref={wrap} className="cp-plot" onPointerLeave={() => setActive(null)}>
      <svg width={width} height={plotH + AXIS} role="img" tabIndex={0} onKeyDown={onKey} onBlur={() => setActive(null)}
        aria-label={`${title}. ${points.length} observations across ${rowsOrder.length} groups${showMean ? ', each group\'s mean marked' : ''}. Arrow keys step through points; the table view lists every value.`}>
        <XAxis ticks={ticks} x={x} y={plotH} format={format} height={plotH} />
        <text className="cp-axis-title" x={x1} y={plotH + 32} textAnchor="end">{xLabel}</text>
        {rowsOrder.map((g, i) => <g key={g}>
          {i > 0 && <line className="cp-band-rule" x1={0} x2={width} y1={i * BAND} y2={i * BAND} />}
          <text className="cp-row-label" x={x0 - 14} y={rowY(g) + 4} textAnchor="end">{g}</text>
          {showMean && isFinite(means[g]!) && <>
            <line className="cp-mean" x1={x(meanTween[g]?.[0] ?? means[g]!)} x2={x(meanTween[g]?.[0] ?? means[g]!)} y1={rowY(g) - 15} y2={rowY(g) + 15} />
            <text className="cp-row-value" x={width - 2} y={rowY(g) + 4} textAnchor="end">x̄ {format(means[g]!)}</text>
          </>}
        </g>)}
        {points.map(p => {
          const cx = x(tween[p.id]?.[0] ?? p.value), cy = rowY(p.group) + (hash01(p.id) - .5) * 22;
          const on = p.id === active;
          return <g key={p.id} onPointerEnter={() => setActive(p.id)}>
            <circle className="cp-hit" cx={cx} cy={cy} r={12} />
            <circle className="cp-dot" data-active={on} cx={cx} cy={cy} r={on ? 6 : 4.5}
              style={{ fill: p.series !== undefined ? seriesColor(slots.get(p.series) ?? 0) : 'var(--data-1)' }} />
          </g>;
        })}
      </svg>
      <Tooltip tip={tip} width={width} />
    </div>
  </Figure>;
}
