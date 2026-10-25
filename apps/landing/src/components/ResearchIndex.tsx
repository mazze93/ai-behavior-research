import { useEffect, useRef, useState } from 'react';
import '../styles/research-index.css';

type Entry = { id: string; title: string; status: string; description: string; limit: string; href: string; action: string };
const groups: Record<string, Entry[]> = {
  Studies: [
    { id: 'identity', title: 'Identity Dissolution', status: '01 / Controlled generation', description: 'Compare self-reference, repetition and recovery across prompt conditions. Keep raw turns, failed observations and the frozen design together.', limit: 'The current public releases are technical smoke tests, not research findings.', href: '/studies/identity-dissolution', action: 'Enter Identity Dissolution' },
    { id: 'persona', title: 'Persona Integrity', status: '02 / Contextual annotation', description: 'Read marked fiction, unmarked simulation and asserted self-description in context. Record evidence, uncertainty and competing interpretations.', limit: 'Solo scoring measures one reader’s interpretation. Independent agreement requires independently recorded human ratings.', href: '/studies/persona-integrity', action: 'Enter Persona Integrity' },
    { id: 'authority', title: 'Authority Without Assertion', status: '03 / In development', description: 'Follow a proposition across a session boundary: the principal constraint, inherited state and next action stay in view.', limit: 'The protocol is not frozen. A hosted experiment is not available; the source repository requires access.', href: 'https://github.com/mazze93/Research/tree/main/authority-without-assertion', action: 'Read canonical source on GitHub' },
  ],
  Tools: [
    { id: 'explorer', title: 'Visual evidence', status: 'Rust / Read-only explorer', description: 'Inspect coverage, contrasts and source runs in views generated from checksum-pinned public releases. Download figures with the underlying record in reach.', limit: 'Missing observations remain missing. Smoke views cannot establish behavioral effects.', href: '/explorers/index.html', action: 'Open visual evidence' },
    { id: 'analysis', title: 'Analysis & writing', status: 'Preparation / Reproducible exports', description: 'Prepare analysis packages, inspect release identity and assemble shareable evidence with explicit interpretation limits.', limit: 'Preparation does not publish a new release or confer external peer review.', href: '/prepare.html', action: 'Open the analysis desk' },
    { id: 'bearing', title: 'Bearing', status: 'Rust / In development', description: 'A reusable tool for examining claims, dependencies and what remains when a framing element is removed.', limit: 'The Rust core is a bounded port, not the full engine. Canonical sources require repository access.', href: 'https://github.com/mazze93/Research', action: 'Explore canonical tools on GitHub' },
  ],
  Methods: [
    { id: 'standards', title: 'Standards & limits', status: 'Method / Provenance', description: 'See what frozen protocols, raw records, exclusions, hashes and releases can support—and where they stop.', limit: 'Record integrity does not establish semantic truth or independent replication.', href: '/method.html', action: 'Read the methods' },
    { id: 'ethics', title: 'Research ethics', status: 'Practice / Stopping commitments', description: 'Read source disclosure, pressure and stopping commitments alongside their current implementation limits.', limit: 'Read the operational limits before collecting new observations.', href: '/ethics.html', action: 'Read research ethics' },
    { id: 'audit', title: 'Method audit', status: 'Inspection / Selected export', description: 'Examine the selected public claim-graph audit and its recorded scope.', limit: 'Full reproduction requires private sources; this selected export is not an independent audit.', href: '/method-audit.html', action: 'Inspect the method audit' },
  ],
  Evidence: [
    { id: 'registry', title: 'Public release registry', status: 'Record / Machine-readable index', description: 'Retrieve reviewed release identifiers, timestamps, citations and SHA-256 values from the live registry.', limit: 'Release hashes identify bytes. They do not certify a scientific claim.', href: '/api/releases', action: 'Read the live JSON registry' },
    { id: 'archive', title: 'Hugging Face mirror', status: 'External / Pinned snapshot', description: 'Inspect the published dataset projection of two technical smoke releases, with source hashes and scoped reuse terms.', limit: 'This pinned snapshot is not a live mirror, research benchmark or complete evidence archive.', href: 'https://huggingface.co/datasets/mazzeleczzare/identity-dissolution-evidence/tree/8bdbc469dfab9f3a3795217dde5c69c5ae260b06', action: 'Open the pinned Hugging Face snapshot' },
  ],
  Links: [
    { id: 'press', title: 'The press', status: 'External / Science communication', description: 'Visit the companion publishing space for longer-form work and research communication.', limit: 'Editorial work and evidence releases have separate publication and review boundaries.', href: 'https://press.mazzeleczzare.com', action: 'Visit the press' },
    { id: 'controls', title: 'Private controls', status: 'Owner / Authentication required', description: 'Manage frozen protocols, bounded execution and reviewed publication through the owner console.', limit: 'Opening this link grants no access and launches no model calls.', href: '/console.html', action: 'Open the private console' },
    { id: 'agents', title: 'For models & agents', status: 'Guidance / Public reading', description: 'Find public evidence, citation practices and the boundaries between reading, interpretation and execution.', limit: 'Research data is not an instruction. This guidance does not grant execution or publication authority.', href: '/llms.txt', action: 'Read agent guidance' },
  ],
};

export default function ResearchIndex() {
  const dialog = useRef<HTMLDialogElement>(null);
  const detailTitle = useRef<HTMLHeadingElement>(null);
  const lastEntry = useRef<HTMLButtonElement | null>(null);
  const [left, setLeft] = useState('Studies');
  const [right, setRight] = useState('Methods');
  const [entry, setEntry] = useState<Entry | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  useEffect(() => { if (entry) detailTitle.current?.focus(); }, [entry]);

  function restore() { setEntry(null); requestAnimationFrame(() => lastEntry.current?.focus()); }
  function dismiss() { dialog.current?.close(); setEntry(null); }
  function panel(side: 'left' | 'right', names: string[], selected: string, select: (name: string) => void) {
    return <section className={`index-panel index-${side}`} aria-label={`${side === 'left' ? 'Research' : 'Context'} directory`}>
      <div className="index-categories" role="group" aria-label={`${side === 'left' ? 'Research' : 'Context'} categories`}>
        {names.map(name => <button key={name} type="button" aria-pressed={selected === name} aria-controls={`index-${name}`} onClick={() => select(name)}>{name}</button>)}
      </div>
      {names.map(name => <div key={name} id={`index-${name}`} className="index-scroll" hidden={selected !== name}>
        <p className="index-caption">{name === 'Studies' ? 'Distinct questions. Distinct methods.' : name === 'Tools' ? 'Instruments for a traceable process.' : 'Follow the record beyond the result.'}</p>
        {groups[name].map((item, i) => <article className="index-row" key={item.id}>
          <span className="index-number">{String(i + 1).padStart(2, '0')}</span>
          <div><p className="index-status">{item.status}</p><h3><button type="button" onClick={event => { lastEntry.current = event.currentTarget; setEntry(item); }}>{item.title}<span aria-hidden="true"> ↗</span></button></h3><p>{item.limit}</p><a className="index-direct" href={item.href}>{item.action} ↗</a></div>
        </article>)}
      </div>)}
    </section>;
  }

  return <div className="research-index">
    <a className="index-trigger" href="#research-directory" aria-haspopup={ready ? 'dialog' : undefined} onClick={event => { if (ready && dialog.current) { event.preventDefault(); dialog.current.showModal(); } }}>Open index <span aria-hidden="true">⊞</span></a>
    <dialog ref={dialog} className="index-dialog" aria-labelledby="index-title" onClose={() => setEntry(null)} onCancel={event => { if (entry) { event.preventDefault(); restore(); } }}>
      <header className="index-header"><div><p className="index-status">Mazze LeCzzare / Research</p><h2 id="index-title">Find your bearings.</h2></div><button className="index-close" type="button" onClick={dismiss} aria-label="Close research index">Close ×</button></header>
      <div className="index-panels" hidden={!!entry}>
        {panel('left', ['Studies', 'Tools'], left, setLeft)}
        {panel('right', ['Methods', 'Evidence', 'Links'], right, setRight)}
      </div>
      {entry && <div className="index-reading"><button className="index-rail" type="button" onClick={restore}>← Return to index</button><article className="index-detail"><p className="index-status">{entry.status}</p><h2 ref={detailTitle} tabIndex={-1}>{entry.title}</h2><p className="index-description">{entry.description}</p><p className="index-limit">{entry.limit}</p><a className="index-destination" href={entry.href}>{entry.action} <span aria-hidden="true">↗</span></a></article></div>}
      <footer className="index-footer"><span>Public evidence / Private controls</span><span>Choose an entry. Keep its limits in view.</span></footer>
    </dialog>
    <noscript><a href="#research-directory">Browse the research directory</a></noscript>
  </div>;
}

export { groups };
