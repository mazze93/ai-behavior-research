import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  DataTable, Figure, Legend, Tooltip, YAxis, compact, linear, niceDomain, niceTicks, seriesColor,
  useTweenMap, useWidth, type Format, type Provenance, type SeriesDef, type TipState,
} from './core';

export interface TrendPoint { x: number | string; y: number | null; low?: number; high?: number }
export interface TrendSeries extends SeriesDef { points: TrendPoint[] }

export interface TrendChartProps {
  title: string;
  kicker?: string;
  provenance: Provenance;
  source?: string;
  note?: string;
  /** Declared order fixes each series' color slot (max five). */
  series: TrendSeries[];
  yLabel: string;
  format?: Format;
  /** Format for x values; dates are ISO strings. */
  xFormat?: (x: number, isDate: boolean) => string;
  height?: number;
  /** Start y at zero (counts, rates). Default true. */
  zero?: boolean;
  /** Band between low/high when the points carry them (a single series reads best). */
  band?: boolean;
}

const M = { top: 16, right: 16, bottom: 34, left: 48 };
const toNum = (x: number | string) => typeof x === 'number' ? x : Date.parse(x);
const defaultX = (x: number, isDate: boolean) => isDate
  ? new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  : compact(x);

/** Change over time or over rounds: 2px lines, end markers, a crosshair that reads every series at one x. */
export function TrendChart({ title, kicker, provenance, source, note, series, yLabel, format = compact, xFormat = defaultX,
  height = 280, zero = true, band = false }: TrendChartProps) {
  const [wrap, width] = useWidth<HTMLDivElement>();
  const [hoverX, setHoverX] = useState<number | null>(null);
  const shown = series.slice(0, 5);
  const isDate = typeof shown[0]?.points[0]?.x === 'string';
  const xs = useMemo(() => [...new Set(shown.flatMap(s => s.points.map(p => toNum(p.x))))].sort((a, b) => a - b), [shown]);
  const endLabels = shown.length <= 4;
  const labelRoom = endLabels ? Math.min(140, Math.max(...shown.map(s => s.label.length * 6.4 + 18), 0)) : 0;
  const x0 = M.left, x1 = Math.max(x0 + 60, width - M.right - labelRoom), y0 = height - M.bottom, y1 = M.top;
  const values = shown.flatMap(s => s.points.flatMap(p => [p.y, band ? p.low : undefined, band ? p.high : undefined])).filter((v): v is number => typeof v === 'number');
  const ydom = niceDomain(values, zero ? [0] : [], 0.02);
  const x = linear([xs[0] ?? 0, xs.at(-1) ?? 1], [x0, x1]);
  const y = linear(ydom, [y0, y1]);
  const yt = niceTicks(ydom[0], ydom[1], 4);
  // x ticks sit on recorded x values (never between them), thinned to fit ~90px apart, always ending on the last.
  const every = Math.max(1, Math.ceil(xs.length / Math.max(2, Math.floor((x1 - x0) / 90))));
  const xt = xs.filter((_, i) => (xs.length - 1 - i) % every === 0);

  // Tween per point; a point that appears grows from its series' previous value, so appended data extends the line.
  const target = Object.fromEntries(shown.map(s => [s.key, xs.map(xv => s.points.find(p => toNum(p.x) === xv)?.y ?? NaN)]));
  const flat: Record<string, number[]> = {};
  shown.forEach(s => xs.forEach((xv, i) => { const v = target[s.key]![i]!; if (!isNaN(v)) flat[`${s.key}@${xv}`] = [v]; }));
  const tw = useTweenMap(flat, (v, key) => {
    const [sk, xv] = [key.slice(0, key.lastIndexOf('@')), +key.slice(key.lastIndexOf('@') + 1)];
    const i = xs.indexOf(xv); let j = i - 1;
    while (j >= 0 && isNaN(target[sk]?.[j] ?? NaN)) j--;
    return j >= 0 ? [target[sk]![j]!] : [ydom[0]];
  });
  const yv = (k: string, i: number) => { const xv = xs[i]; if (xv === undefined) return null; return tw[`${k}@${xv}`]?.[0] ?? null; };

  const path = (k: string) => {
    let d = '', pen = false;
    xs.forEach((xv, i) => { const v = yv(k, i); if (v === null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(xv).toFixed(1)},${y(v).toFixed(1)}`; pen = true; });
    return d;
  };
  const bandPath = (s: TrendSeries) => {
    const pts = s.points.filter(p => p.low !== undefined && p.high !== undefined).map(p => ({ x: toNum(p.x), lo: p.low!, hi: p.high! })).sort((a, b) => a.x - b.x);
    if (pts.length < 2) return '';
    return pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.x)},${y(p.hi)}`).join('') + pts.slice().reverse().map(p => `L${x(p.x)},${y(p.lo)}`).join('') + 'Z';
  };

  const nearest = (px: number) => xs.reduce((best, xv) => Math.abs(x(xv) - px) < Math.abs(x(best) - px) ? xv : best, xs[0] ?? 0);
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHoverX(nearest(e.clientX - r.left));
  };
  const onKey = (e: KeyboardEvent) => {
    const i = hoverX === null ? -1 : xs.indexOf(hoverX);
    if (e.key === 'ArrowRight') { e.preventDefault(); setHoverX(xs[Math.min(xs.length - 1, i + 1)] ?? null); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setHoverX(xs[Math.max(0, i < 0 ? xs.length - 1 : i - 1)] ?? null); }
    if (e.key === 'Escape') setHoverX(null);
  };
  const hi = hoverX === null ? -1 : xs.indexOf(hoverX);
  const tip: TipState | null = hoverX === null ? null : {
    x: x(hoverX), y: M.top + 8, title: xFormat(hoverX, isDate),
    lines: shown.map((s, si) => ({ key: s.key, color: seriesColor(si), label: s.label, value: yv(s.key, hi) === null ? 'no record' : format(target[s.key]![hi]!) })),
  };

  // End labels: last defined value per series; fall back to legend only when they would collide.
  const ends = shown.map((s, si) => {
    let i = xs.length - 1; while (i >= 0 && isNaN(target[s.key]![i]!)) i--;
    return i < 0 ? null : { key: s.key, label: s.label, si, x: x(xs[i]!), y: y(yv(s.key, i) ?? target[s.key]![i]!), v: target[s.key]![i]! };
  }).filter((e): e is NonNullable<typeof e> => !!e);
  const sorted = [...ends].sort((a, b) => a.y - b.y);
  const collide = sorted.some((e, i) => i > 0 && e.y - sorted[i - 1]!.y < 14);

  const table = <DataTable caption={title} rows={xs} columns={[
    { key: 'x', label: isDate ? 'Date' : 'x', value: xv => xFormat(xv, isDate) },
    ...shown.map(s => ({ key: s.key, label: s.label, align: 'right' as const, value: (xv: number) => {
      const p = s.points.find(q => toNum(q.x) === xv);
      return p?.y === null || p?.y === undefined ? null : format(p.y) + (p.low !== undefined && p.high !== undefined ? ` (${format(p.low)}–${format(p.high)})` : '');
    } })),
  ]} />;

  return <Figure title={title} kicker={kicker} provenance={provenance} source={source} note={note} table={table}
    legend={<Legend kind="line" items={shown.map((s, i) => ({ key: s.key, label: s.label, color: seriesColor(i) }))} />}>
    <div ref={wrap} className="cp-plot">
      <svg width={width} height={height} role="img" tabIndex={0} onPointerMove={onMove} onPointerLeave={() => setHoverX(null)} onKeyDown={onKey} onBlur={() => setHoverX(null)}
        aria-label={`${title}. ${shown.length} series over ${xs.length} points. Left and right arrows move the crosshair; the table view lists every value.`}>
        <YAxis ticks={yt} y={y} x0={x0} x1={x1} format={format} />
        <text className="cp-axis-title" x={x0} y={M.top - 4}>{yLabel}</text>
        <g className="cp-axis" aria-hidden="true">
          {xt.map(t => <text key={t} x={x(t)} y={y0 + 20} textAnchor="middle">{xFormat(t, isDate)}</text>)}
          <line className="cp-baseline" x1={x0} x2={x1} y1={y(ydom[0])} y2={y(ydom[0])} />
        </g>
        {band && shown.map((s, si) => <path key={`b-${s.key}`} className="cp-band" d={bandPath(s)} style={{ fill: seriesColor(si) }} />)}
        {shown.length === 1 && !band && <path className="cp-area" d={`${path(shown[0]!.key)}L${x(xs.at(-1)!)},${y(ydom[0])}L${x(xs[0]!)},${y(ydom[0])}Z`} style={{ fill: seriesColor(0) }} />}
        {shown.map((s, si) => <path key={s.key} className="cp-line" d={path(s.key)} style={{ stroke: seriesColor(si) }} />)}
        {hoverX !== null && <line className="cp-crosshair" x1={x(hoverX)} x2={x(hoverX)} y1={y1} y2={y0} />}
        {ends.map(e => <circle key={e.key} className="cp-dot" cx={e.x} cy={e.y} r={4.5} style={{ fill: seriesColor(e.si) }} />)}
        {hoverX !== null && shown.map((s, si) => { const v = yv(s.key, hi); return v === null ? null :
          <circle key={`h-${s.key}`} className="cp-dot" cx={x(hoverX)} cy={y(v)} r={5.5} style={{ fill: seriesColor(si) }} />; })}
        {endLabels && !collide && ends.map(e => <text key={`l-${e.key}`} className="cp-end-label" x={e.x + 10} y={e.y + 4}>{e.label} <tspan>{format(e.v)}</tspan></text>)}
      </svg>
      <Tooltip tip={tip} width={width} />
    </div>
  </Figure>;
}
