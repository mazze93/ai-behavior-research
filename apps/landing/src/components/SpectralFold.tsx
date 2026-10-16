import { useEffect, useRef, useState } from 'react';
import { blend, paths, profiles, shapes, type Contours, type StudyId } from './spectral-profiles';

export interface Props {
  id: string;
  study: StudyId;
}

export default function SpectralFold({ id, study }: Props) {
  const [turn, setTurn] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [moving, setMoving] = useState(false);
  const reduced = useRef(true);
  const frame = useRef(0);
  const morphFrame = useRef(0);
  const visible = useRef(true);
  const currentStudy = useRef(study);
  currentStudy.current = study;
  const currentShape = useRef<Contours>(shapes[study]);
  const [contours, setContours] = useState<Contours>(shapes[study]);
  const [morphing, setMorphing] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const profile = profiles[study];

  useEffect(() => {
    setReady(true);
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      reduced.current = query.matches;
      if (query.matches) {
        cancelAnimationFrame(frame.current); setMoving(false);
        cancelAnimationFrame(morphFrame.current); setMorphing(false);
        currentShape.current = shapes[currentStudy.current]; setContours(currentShape.current);
      }
    };
    sync(); query.addEventListener('change', sync);
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame.current); setMoving(false);
        cancelAnimationFrame(morphFrame.current); setMorphing(false);
        currentShape.current = shapes[currentStudy.current]; setContours(currentShape.current);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    const observer = new IntersectionObserver(([entry]) => {
      visible.current = entry?.isIntersecting ?? false;
      if (!visible.current) {
        cancelAnimationFrame(frame.current); setMoving(false);
        cancelAnimationFrame(morphFrame.current); setMorphing(false);
        currentShape.current = shapes[currentStudy.current]; setContours(currentShape.current);
      }
    });
    if (panel.current) observer.observe(panel.current);
    return () => {
      cancelAnimationFrame(frame.current); cancelAnimationFrame(morphFrame.current); observer.disconnect();
      query.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    cancelAnimationFrame(morphFrame.current);
    const target = shapes[study], from = currentShape.current;
    if (reduced.current || !visible.current || document.hidden || from === target) {
      currentShape.current = target; setContours(target); setMorphing(false); return;
    }
    const start = performance.now();
    setMorphing(true);
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / 460);
      currentShape.current = t === 1 ? target : blend(from, target, 1 - Math.pow(1 - t, 3));
      setContours(currentShape.current);
      if (t < 1) morphFrame.current = requestAnimationFrame(animate);
      else setMorphing(false);
    };
    morphFrame.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(morphFrame.current);
  }, [study]);

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

  return <figure id={id} className="spectral-fold" ref={panel} data-study={study} data-morphing={morphing}>
    <div className="fold-label"><span>{profile.label}</span><span>Interactive illustration</span></div>
    <div className="fold-surface" onPointerMove={event => {
      if (reduced.current || moving || event.pointerType !== 'mouse') return;
      const rect = event.currentTarget.getBoundingClientRect();
      setTilt({ x: (event.clientX - rect.left) / rect.width * 16 - 8,
        y: (event.clientY - rect.top) / rect.height * 12 - 6 });
    }} onPointerLeave={() => setTilt({ x: 0, y: 0 })}>
      <svg viewBox="0 0 560 560" role="img" aria-labelledby={`${id}-title ${id}-description`}>
        <title id={`${id}-title`}>{profile.title}</title>
        <desc id={`${id}-description`}>{profile.description} The turn button changes its orientation. No research data is represented.</desc>
        <defs>
          <linearGradient id={`${id}-light`} x1="0%" y1="0%" x2="100%" y2="100%">
            {['0', '.22', '.45', '.7', '.88', '1'].map((offset, i) =>
              <stop key={offset} offset={offset} stopColor={profile.colors[i]} />)}
          </linearGradient>
        </defs>
        <g className="fold-crosshair" fill="none" stroke="currentColor">
          <path d="M24 280H50M510 280H536M280 24V50M280 510V536" />
          <circle cx="280" cy="280" r="240" strokeDasharray="1 12" />
        </g>
        <g className="fold-object" transform={`translate(${280 + tilt.x} ${280 + tilt.y}) rotate(${-32 + turn}) skewX(-9)`}
          fill="none" stroke={`url(#${id}-light)`} strokeWidth="2.65">
          {paths(contours).map((d, index) => <path key={index} d={d} opacity={.67 + index / 145} />)}
        </g>
        <circle className="fold-center" cx="280" cy="280" r="2" fill="currentColor" />
      </svg>
    </div>
    <figcaption>
      <span>{profile.caption}<br /><span className="fold-instruction">Move across the field, or turn it.</span></span>
      <button type="button" className="fold-turn" onClick={rotate} disabled={!ready || moving} aria-label="Turn the spectral fold by 90 degrees">
        Turn the fold <span aria-hidden="true">↗</span>
      </button>
    </figcaption>
    <noscript><p className="fold-instruction">The full-color illustration is visible. Turning it requires JavaScript.</p></noscript>
  </figure>;
}
