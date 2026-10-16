import { useEffect, useRef, useState } from 'react';

export interface Props {
  id: string;
}

// Authored geometry, not a rendering of research measurements.
const contours = Array.from({ length: 48 }, (_, band) => {
  const depth = band / 47;
  const points = Array.from({ length: 112 }, (_, point) => {
    const angle = point / 111 * Math.PI * 2;
    const radius = 84 + depth * 132;
    const x = radius * Math.cos(angle) * (1 + .15 * Math.sin(3 * angle));
    const y = radius * Math.sin(angle) * .76 + 40 * Math.cos(2 * angle) * depth;
    return `${point ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return points.join(' ') + ' Z';
});

export default function SpectralFold({ id }: Props) {
  const [turn, setTurn] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [moving, setMoving] = useState(false);
  const reduced = useRef(true);
  const frame = useRef(0);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    setReady(true);
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      reduced.current = query.matches;
      if (query.matches) { cancelAnimationFrame(frame.current); setMoving(false); }
    };
    sync(); query.addEventListener('change', sync);
    const onVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(frame.current); setMoving(false); }
    };
    document.addEventListener('visibilitychange', onVisibility);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) { cancelAnimationFrame(frame.current); setMoving(false); }
    });
    if (panel.current) observer.observe(panel.current);
    return () => {
      cancelAnimationFrame(frame.current); observer.disconnect();
      query.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  function rotate() {
    cancelAnimationFrame(frame.current);
    setTilt({ x: 0, y: 0 });
    const target = turn + 90;
    if (reduced.current) { setTurn(target); return; }
    const start = performance.now(), origin = turn;
    setMoving(true);
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / 850);
      setTurn(origin + (target - origin) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame.current = requestAnimationFrame(animate);
      else setMoving(false);
    };
    frame.current = requestAnimationFrame(animate);
  }

  return <figure className="spectral-fold" ref={panel}>
    <div className="fold-label"><span>01 / Chromatic fold</span><span>Interactive illustration</span></div>
    <div className="fold-surface" onPointerMove={event => {
      if (reduced.current || moving || event.pointerType !== 'mouse') return;
      const rect = event.currentTarget.getBoundingClientRect();
      setTilt({ x: (event.clientX - rect.left) / rect.width * 16 - 8,
        y: (event.clientY - rect.top) / rect.height * 12 - 6 });
    }} onPointerLeave={() => setTilt({ x: 0, y: 0 })}>
      <svg viewBox="0 0 560 560" role="img" aria-labelledby={`${id}-title ${id}-description`}>
        <title id={`${id}-title`}>A folded field of spectral contours</title>
        <desc id={`${id}-description`}>An original optical illustration in cyan, violet, coral and yellow. The turn button changes its orientation. No research data is represented.</desc>
        <defs>
          <linearGradient id={`${id}-light`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0" stopColor="var(--chromatic-cyan)" />
            <stop offset=".22" stopColor="var(--chromatic-blue)" />
            <stop offset=".45" stopColor="var(--chromatic-pink)" />
            <stop offset=".7" stopColor="var(--chromatic-coral)" />
            <stop offset=".88" stopColor="var(--chromatic-yellow)" />
            <stop offset="1" stopColor="var(--chromatic-cyan)" />
          </linearGradient>
        </defs>
        <g className="fold-crosshair" fill="none" stroke="currentColor">
          <path d="M24 280H50M510 280H536M280 24V50M280 510V536" />
          <circle cx="280" cy="280" r="240" strokeDasharray="1 12" />
        </g>
        <g className="fold-object" transform={`translate(${280 + tilt.x} ${280 + tilt.y}) rotate(${-32 + turn}) skewX(-9)`}
          fill="none" stroke={`url(#${id}-light)`} strokeWidth="2.65">
          {contours.map((d, index) => <path key={index} d={d} opacity={.67 + index / 145} />)}
        </g>
        <circle className="fold-center" cx="280" cy="280" r="2" fill="currentColor" />
      </svg>
    </div>
    <figcaption>
      <span>A little interference.<br /><span className="fold-instruction">Move across the field, or turn it.</span></span>
      <button type="button" className="fold-turn" onClick={rotate} disabled={!ready || moving} aria-label="Turn the spectral fold by 90 degrees">
        Turn the fold <span aria-hidden="true">↗</span>
      </button>
    </figcaption>
    <noscript><p className="fold-instruction">The full-color illustration is visible. Turning it requires JavaScript.</p></noscript>
  </figure>;
}
