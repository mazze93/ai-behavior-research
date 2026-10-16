import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

/* Shared machinery for the data-visualization units: scales, ticks, number
   formats, tweened transitions, resize tracking, tooltips, legends and the
   table twin every chart carries. Colors are CSS custom properties from
   tokens.json, so charts follow the active theme without re-rendering. */

export type Provenance = 'recorded' | 'synthetic' | 'illustrative' | 'fixture' | 'unrun';

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  recorded: 'Recorded evidence',
  synthetic: 'Synthetic data — machinery check, not a finding',
  illustrative: 'Illustration — no research data',
  fixture: 'Calibration fixture',
  unrun: 'Check not yet run — counts zero',
};

/** The five categorical slots, in fixed order. A sixth series is never generated. */
export const SERIES_SLOTS = 5;
export const seriesColor = (slot: number) => `var(--data-${Math.min(slot, SERIES_SLOTS - 1) + 1})`;
export const seqColor = (step: number) => `var(--data-seq-${Math.max(1, Math.min(5, step))})`;
export const DIV_STEPS = ['data-div-neg-2', 'data-div-neg-1', 'data-div-mid', 'data-div-pos-1', 'data-div-pos-2'] as const;

export interface SeriesDef { key: string; label: string }

/** Slot per series key, from the declared order — never from rank, so filtering never repaints survivors. */
export function slotMap(series: readonly SeriesDef[] | undefined): Map<string, number> {
  return new Map((series ?? []).map((s, i) => [s.key, i]));
}

// ---------------------------------------------------------------- scales & ticks

export function linear(domain: readonly [number, number], range: readonly [number, number]) {
  const [d0, d1] = domain, [r0, r1] = range;
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}

export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!isFinite(min) || !isFinite(max)) return [];
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / Math.max(1, count);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? 10 * mag;
  const start = Math.ceil(min / step - 1e-9) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step * 1e-9; v += step) out.push(+v.toPrecision(12));
  return out;
}

export function niceDomain(values: number[], include: number[] = [], pad = 0): [number, number] {
  const all = values.concat(include).filter(Number.isFinite);
  if (!all.length) return [0, 1];
  let lo = Math.min(...all), hi = Math.max(...all);
  if (lo === hi) { lo -= 1; hi += 1; }
  const span = hi - lo;
  lo -= span * pad; hi += span * pad;
  const ticks = niceTicks(lo, hi, 5);
  const step = ticks.length > 1 ? ticks[1]! - ticks[0]! : span;
  let a = Math.min(lo, Math.floor(lo / step) * step), b = Math.max(hi, Math.ceil(hi / step) * step);
  // Padding never pushes a non-negative measure below an included zero (or a non-positive one above it).
  if (include.includes(0) && values.every(v => v >= 0) && a < 0) a = 0;
  if (include.includes(0) && values.every(v => v <= 0) && b > 0) b = 0;
  return [a, b];
}

// ---------------------------------------------------------------- formats

export type Format = (v: number) => string;

export function compact(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e9) return `${+(v / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${+(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${+(v / 1e3).toFixed(1)}K`;
  if (a === 0) return '0';
  if (a < 0.01) return v.toExponential(1);
  return `${+v.toFixed(a < 1 ? 2 : a < 10 ? 1 : 0)}`;
}
export const percent: Format = v => `${+(v * 100).toFixed(Math.abs(v) < 0.1 ? 1 : 0)}%`;
export const fixed = (digits: number): Format => v => v.toFixed(digits);
export const signed = (f: Format): Format => v => (v > 0 ? '+' : v < 0 ? '−' : '') + f(Math.abs(v));

// ---------------------------------------------------------------- hooks

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const q = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(q.matches);
    sync(); q.addEventListener('change', sync);
    return () => q.removeEventListener('change', sync);
  }, []);
  return reduced;
}

/** Element width, tracked with ResizeObserver. */
export function useWidth<T extends HTMLElement>(fallback = 640): [RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth || fallback);
    const ro = new ResizeObserver(([entry]) => { if (entry) setWidth(Math.round(entry.contentRect.width) || fallback); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, width];
}

/**
 * Tween a keyed map of numeric tuples toward `target`. Keys present before
 * morph from where they currently are (a reversal mid-flight starts from the
 * in-between frame, never queues); new keys start from `enter(key, value)`.
 * Motion runs only when data changes — there is no ambient loop — and is off
 * under prefers-reduced-motion.
 */
export function useTweenMap(target: Record<string, number[]>, enter?: (v: number[], key: string) => number[], duration = 480) {
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState(target);
  const current = useRef(target);
  const raf = useRef(0);
  const sig = JSON.stringify(target);
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    const from: Record<string, number[]> = {};
    for (const [k, v] of Object.entries(target)) {
      const prev = current.current[k];
      from[k] = prev && prev.length === v.length ? prev : (enter ? enter(v, k) : v);
    }
    if (reduced || document.hidden) { current.current = target; setFrame(target); return; }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration), e = 1 - Math.pow(1 - t, 3);
      const next: Record<string, number[]> = {};
      for (const [k, v] of Object.entries(target)) next[k] = v.map((x, i) => from[k]![i]! + (x - from[k]![i]!) * e);
      current.current = next; setFrame(next);
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, reduced]);
  return frame;
}

/** Re-run when the document or an ancestor switches data-theme. */
export function useThemeVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const mo = new MutationObserver(() => setV(x => x + 1));
    mo.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return v;
}

/** Relative luminance of a computed rgb() color. */
export function luminance(rgb: string): number {
  const m = rgb.match(/[\d.]+/g);
  if (!m || m.length < 3) return 1;
  const [r, g, b] = m.slice(0, 3).map(x => { const c = +x / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
  return .2126 * r! + .7152 * g! + .0722 * b!;
}

/** Sets each `[data-fill]` child's text to charcoal or porcelain, whichever clears its fill. */
export function useOnFillText(ref: RefObject<HTMLElement | SVGElement>, deps: unknown[]) {
  const theme = useThemeVersion();
  useLayoutEffect(() => {
    ref.current?.querySelectorAll<SVGElement | HTMLElement>('[data-fill]').forEach(el => {
      const fill = getComputedStyle(el).getPropertyValue(el instanceof SVGElement ? 'fill' : 'background-color');
      const label = el.parentElement?.querySelector<SVGElement | HTMLElement>(`[data-on="${el.getAttribute('data-fill')}"]`);
      if (label) label.style.setProperty('--on-fill', luminance(fill) > .2 ? 'var(--charcoal)' : 'var(--porcelain)');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, ...deps]);
}

// ---------------------------------------------------------------- pieces

export interface TipLine { key?: string; color?: string; label: string; value: string }
export interface TipState { x: number; y: number; title: string; lines: TipLine[] }

/** Tooltip: enhances, never gates — every value is also in the table view. */
export function Tooltip({ tip, width }: { tip: TipState | null; width: number }) {
  if (!tip) return null;
  const left = Math.min(Math.max(tip.x + 14, 8), width - 228);
  return <div className="cp-tip" role="status" style={{ left, top: Math.max(tip.y - 12, 0) }}>
    <strong>{tip.title}</strong>
    {tip.lines.map((l, i) => <span key={l.key ?? i}>
      {l.color && <i style={{ background: l.color }} aria-hidden="true" />}
      <em>{l.label}</em><b>{l.value}</b>
    </span>)}
  </div>;
}

export function Legend({ items, kind = 'dot' }: { items: { key: string; label: string; color: string }[]; kind?: 'dot' | 'line' | 'block' }) {
  if (items.length < 2) return null;
  return <ul className="cp-legend" aria-label="Legend">
    {items.map(it => <li key={it.key}><i className={`cp-key cp-key--${kind}`} style={{ background: it.color }} aria-hidden="true" />{it.label}</li>)}
  </ul>;
}

export interface Column<R> { key: string; label: string; align?: 'left' | 'right'; value: (row: R) => string | number | null | undefined }

export function DataTable<R>({ caption, columns, rows }: { caption?: string; columns: Column<R>[]; rows: R[] }) {
  return <div className="cp-table-wrap" tabIndex={0} role="region" aria-label={caption ?? 'Data table'}>
    <table className="cp-table">
      {caption && <caption>{caption}</caption>}
      <thead><tr>{columns.map(c => <th key={c.key} scope="col" style={{ textAlign: c.align ?? 'left' }}>{c.label}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{columns.map(c => {
        const v = c.value(r);
        return <td key={c.key} style={{ textAlign: c.align ?? 'left' }}>{v === null || v === undefined || v === '' ? '—' : v}</td>;
      })}</tr>)}</tbody>
    </table>
  </div>;
}

export interface FigureProps {
  /** Sentence-case title naming what is plotted. */
  title: string;
  /** Record line above the title: study / measure / unit. */
  kicker?: string;
  /** Where the numbers come from. Shown in words, never in color. */
  provenance: Provenance;
  /** Source path, release or hash. */
  source?: string;
  /** Limitations and reading notes, shown under the plot. */
  note?: ReactNode;
  legend?: ReactNode;
  /** Optional controls placed in the figure's top row (one filter row per figure). */
  controls?: ReactNode;
  table: ReactNode;
  children: ReactNode;
  id?: string;
}

/** The frame every chart lives in: kicker, title, provenance, legend, chart/table switch, notes. */
export function Figure({ title, kicker, provenance, source, note, legend, controls, table, children, id }: FigureProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  return <figure className="cp-figure" id={id} data-provenance={provenance}>
    <div className="cp-figure-head">
      <div>
        {kicker && <p className="cp-record">{kicker}</p>}
        <h3 className="cp-figure-title">{title}</h3>
      </div>
      <div className="cp-figure-controls">
        {controls}
        <div className="cp-segmented" role="group" aria-label="View">
          <button type="button" aria-pressed={view === 'chart'} onClick={() => setView('chart')}>Chart</button>
          <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}>Table</button>
        </div>
      </div>
    </div>
    <p className="cp-provenance cp-record" data-kind={provenance}><span aria-hidden="true" />{PROVENANCE_LABEL[provenance]}{source && <> · <span className="cp-source">{source}</span></>}</p>
    {legend}
    <div className="cp-figure-body">{view === 'chart' ? children : table}</div>
    {note && <figcaption className="cp-figure-note">{note}</figcaption>}
  </figure>;
}

/** Axis tick labels along x, as SVG. */
export function XAxis({ ticks, x, y, format, height }: { ticks: number[]; x: (v: number) => number; y: number; format: Format; height: number }) {
  return <g className="cp-axis" aria-hidden="true">
    {ticks.map(t => <g key={t}>
      <line className="cp-grid" x1={x(t)} x2={x(t)} y1={y - height} y2={y} />
      <text x={x(t)} y={y + 16} textAnchor="middle">{format(t)}</text>
    </g>)}
  </g>;
}

export function YAxis({ ticks, y, x0, x1, format }: { ticks: number[]; y: (v: number) => number; x0: number; x1: number; format: Format }) {
  return <g className="cp-axis" aria-hidden="true">
    {ticks.map(t => <g key={t}>
      <line className="cp-grid" x1={x0} x2={x1} y1={y(t)} y2={y(t)} />
      <text x={x0 - 8} y={y(t) + 4} textAnchor="end">{format(t)}</text>
    </g>)}
  </g>;
}

/** Stable pseudo-random in [0,1) from a string — deterministic jitter. */
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}

/** Approximate text width for label-fit decisions (Manrope at ~11px). */
export const textWidth = (s: string, px = 11) => s.length * px * 0.58;
