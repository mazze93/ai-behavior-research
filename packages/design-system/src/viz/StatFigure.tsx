import { useTweenMap, type Format, type Provenance, PROVENANCE_LABEL, compact, signed } from './core';

export interface StatFigureProps {
  /** Sentence case, no trailing colon. */
  label: string;
  value: number | null;
  format?: Format;
  /** Uncertainty interval, shown as "95% interval a to b". */
  interval?: [number, number];
  intervalLabel?: string;
  n?: number | string;
  /** Change against a named reference ("vs C0 narrative"). Rendered in ink: direction is stated, never colored good/bad. */
  delta?: { value: number; against: string; format?: Format };
  /** Up to ~24 points, oldest first; the last point is marked. */
  trend?: number[];
  provenance: Provenance;
  /** Size: 'hero' is the one lead number of a view. */
  size?: 'hero' | 'tile';
}

function Sparkline({ values }: { values: number[] }) {
  const w = 120, h = 32, lo = Math.min(...values), hi = Math.max(...values);
  const x = (i: number) => (i / Math.max(1, values.length - 1)) * (w - 8) + 4;
  const y = (v: number) => hi === lo ? h / 2 : h - 4 - ((v - lo) / (hi - lo)) * (h - 8);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  return <svg className="cp-spark" width={w} height={h} aria-hidden="true">
    <path d={d} className="cp-spark-line" />
    <circle cx={x(values.length - 1)} cy={y(values.at(-1)!)} r={4} className="cp-dot" style={{ fill: 'var(--data-1)' }} />
  </svg>;
}

/** When the form is a number: one value with its interval, n and provenance, optionally a delta and a trend. */
export function StatFigure({ label, value, format = compact, interval, intervalLabel = '95% interval', n, delta, trend, provenance, size = 'tile' }: StatFigureProps) {
  const tw = useTweenMap(value === null ? {} : { v: [value] }, () => [0]);
  const shown = value === null ? null : (tw.v?.[0] ?? value);
  return <div className={`cp-stat cp-stat--${size}`} data-provenance={provenance}>
    <p className="cp-stat-label">{label}</p>
    <p className="cp-stat-value" aria-label={value === null ? `${label}: not yet measured` : `${label}: ${format(value)}`}>
      {shown === null ? <span className="cp-stat-empty">Not run</span> : format(shown)}
    </p>
    <div className="cp-stat-meta">
      {interval && <span>{intervalLabel} {format(interval[0])} to {format(interval[1])}</span>}
      {n !== undefined && <span>n = {n}</span>}
      {delta && <span className="cp-stat-delta">{(delta.format ?? signed(format))(delta.value)} {delta.value > 0 ? '↑' : delta.value < 0 ? '↓' : '→'} vs {delta.against}</span>}
    </div>
    {trend && trend.length > 1 && <Sparkline values={trend} />}
    <p className="cp-provenance cp-record" data-kind={provenance}><span aria-hidden="true" />{PROVENANCE_LABEL[provenance]}</p>
  </div>;
}
