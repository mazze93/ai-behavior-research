import { useEffect, useRef, useState } from 'react';
import SpectralFold from './SpectralFold';
import type { StudyId } from './spectral-profiles';

export interface Props {
  id: string;
}

const studies = [
  { id: 'identity-dissolution', number: '01', name: 'Identity Dissolution', lines: ['Identity', 'Dissolution'],
    method: 'Controlled generation / Factorial design',
    description: 'Self-reference, repetition and recovery. Compare prompt conditions, inspect raw turns, and preserve failed observations.',
    capability: 'Recorded smoke evidence', entry: 'Enter the lab' },
  { id: 'persona-integrity', number: '02', name: 'Persona Integrity', lines: ['Persona', 'Integrity'],
    method: 'Contextual reading / Categorical annotation',
    description: 'Marked fiction, unmarked simulation, asserted self-description. Read in context; record alternatives and uncertainty.',
    capability: 'Local scoring instrument', entry: 'Open the study' },
] as const;

export default function StudyRoom({ id }: Props) {
  const [selected, setSelected] = useState<StudyId>('overview');
  const [hovered, setHovered] = useState<StudyId | null>(null);
  const [focused, setFocused] = useState<StudyId | null>(null);
  const [ready, setReady] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const active = hovered ?? focused ?? selected;
  useEffect(() => { setReady(true); }, []);

  function select(study: StudyId, reveal = false) {
    setSelected(study); setHovered(null); setFocused(null);
    if (reveal && matchMedia('(max-width: 680px)').matches) {
      stage.current?.querySelector<HTMLButtonElement>(`[data-preview-study="${study}"]`)?.focus({ preventScroll: true });
      stage.current?.scrollIntoView({ block: 'start', behavior:
        matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  }

  function focus(study: StudyId) { setFocused(study); setHovered(null); }

  return <section className="landing-hero study-room" aria-labelledby="hero-title" data-active-study={active}>
    <div className="hero-type">
      <p className="eyebrow">Observable behavior.<br />Accountable interpretation.</p>
      <h1 id="hero-title"><span>Question.</span><span>Record.</span><span>Reconsider.</span></h1>
      <div className="hero-bottom"><p>What models say.<br />What changes.<br /><strong>What the record supports.</strong></p><a className="text-link" href="#studies">Enter the studies <span aria-hidden="true">↓</span></a></div>
    </div>
    <div className="hero-object" ref={stage}>
      <SpectralFold id={id} study={active} />
      <div className="study-switcher" role="group" aria-label="Choose a study illustration">
        {([{ id: 'overview', label: 'Index', name: 'the index' },
          { id: 'identity-dissolution', label: '01 / Identity', name: 'Identity Dissolution' },
          { id: 'persona-integrity', label: '02 / Persona', name: 'Persona Integrity' }] as const).map(item =>
          <button key={item.id} type="button" aria-label={`Preview ${item.name} illustration`}
            disabled={!ready}
            aria-pressed={selected === item.id} data-preview-study={item.id}
            onPointerEnter={e => { if (e.pointerType !== 'touch') setHovered(item.id); }}
            onPointerLeave={() => setHovered(null)} onFocus={() => focus(item.id)} onBlur={() => setFocused(null)}
            onClick={() => select(item.id)}>{item.label}</button>)}
      </div>
      <p className="object-note" role="status" aria-live="polite">{active === 'overview' ? 'A spectrum can be beautiful.' :
        `${active === selected ? 'Selected' : 'Previewing'} / ${studies.find(study => study.id === active)!.name}`}<br />An illustration, not a finding.</p>
    </div>
    <section className="study-index" id="studies" aria-labelledby="studies-title">
      <div className="section-label"><h2 id="studies-title">Working instruments</h2><span>02 / Distinct methods</span></div>
      {studies.map(study => <article key={study.id} className="study-row" data-study={study.id} data-active={active === study.id}
        onPointerEnter={e => { if (e.pointerType !== 'touch') setHovered(study.id); }}
        onPointerLeave={() => setHovered(null)} onFocus={() => focus(study.id)}
        onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(null); }}>
        <span className="study-number">{study.number}</span>
        <div className="study-name"><span className="eyebrow">{study.method}</span><h3 aria-label={study.name}>
          <button type="button" className="study-preview" aria-label={`Preview ${study.name} illustration`}
            disabled={!ready}
            aria-pressed={selected === study.id} onClick={() => select(study.id, true)}>
            {study.lines.map((line, i) => <span key={line}>{i > 0 && <br />}{line}</span>)}
          </button></h3></div>
        <div className="study-description"><p>{study.description}</p><span className="capability">{study.capability}</span></div>
        <a className="study-enter" href={`/studies/${study.id}`} aria-label={`Open ${study.name}`}>{study.entry} <span aria-hidden="true">↗</span></a>
      </article>)}
    </section>
  </section>;
}
