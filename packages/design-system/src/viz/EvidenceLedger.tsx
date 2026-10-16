import { useState } from 'react';
import { DataTable, Figure, type Provenance } from './core';

/** Bearing ledger states (authority-without-assertion graph/ledger.yml) and lacuna-lab confidence grades. */
export type ClaimState = 'candidate' | 'supported' | 'contradicted' | 'mixed' | 'retired';
export type Confidence = 'verified' | 'inferred' | 'assumed' | 'hallucinated';
export type CheckStatus = 'unrun' | 'run' | 'inspected';

export interface LedgerCheck {
  id: string;
  title: string;
  status: CheckStatus;
  /** tested-by / supports / contradicts — appended only after results are inspected. */
  relation?: 'tested-by' | 'supports' | 'contradicts';
  /** Under ADR-0006 an unrun check counts zero. */
  counts?: boolean;
  date?: string;
}

export interface LedgerClaim {
  id: string;
  /** H1, H2 … or a gap id. */
  code?: string;
  title: string;
  state: ClaimState;
  confidence: Confidence;
  checks: LedgerCheck[];
}

export interface EvidenceLedgerProps {
  title: string;
  kicker?: string;
  provenance: Provenance;
  source?: string;
  note?: string;
  claims: LedgerClaim[];
}

const CONF_RANK: Record<Confidence, number> = { verified: 3, inferred: 2, assumed: 1, hallucinated: 0 };
const STATUS_LABEL: Record<CheckStatus, string> = { unrun: 'Unrun — counts zero', run: 'Run — not yet inspected', inspected: 'Inspected' };

/**
 * Claims and the checks that test them, in ledger order. Status is carried by
 * words and by fill (open → hatched → solid ink), never by hue: color does not
 * encode scientific validity.
 */
export function EvidenceLedger({ title, kicker, provenance, source, note, claims }: EvidenceLedgerProps) {
  const [open, setOpen] = useState<string | null>(null);
  const counted = claims.flatMap(c => c.checks).filter(k => k.status === 'inspected' && k.counts !== false).length;
  const total = claims.flatMap(c => c.checks).length;

  const table = <DataTable caption={title} rows={claims.flatMap(c => c.checks.length ? c.checks.map(k => ({ c, k })) : [{ c, k: null as LedgerCheck | null }])} columns={[
    { key: 'c', label: 'Claim', value: d => `${d.c.code ? d.c.code + ' ' : ''}${d.c.title}` },
    { key: 's', label: 'State', value: d => d.c.state },
    { key: 'f', label: 'Confidence', value: d => d.c.confidence },
    { key: 'k', label: 'Check', value: d => d.k?.title },
    { key: 'r', label: 'Relation', value: d => d.k?.relation },
    { key: 't', label: 'Status', value: d => d.k ? STATUS_LABEL[d.k.status] : null },
  ]} />;

  return <Figure title={title} kicker={kicker} provenance={provenance} source={source} note={note} table={table}
    legend={<ul className="cp-legend cp-ledger-key" aria-label="Check status key">
      {(['unrun', 'run', 'inspected'] as CheckStatus[]).map(s => <li key={s}><i className={`cp-check cp-check--${s}`} aria-hidden="true" />{STATUS_LABEL[s]}</li>)}
      <li className="cp-ledger-tally">{counted} of {total} checks count</li>
    </ul>}>
    <ol className="cp-ledger">
      {claims.map(c => <li key={c.id} className="cp-claim" data-state={c.state}>
        <div className="cp-claim-head">
          <span className="cp-record cp-claim-code">{c.code ?? '—'}</span>
          <h4>{c.title}</h4>
          <span className="cp-record cp-claim-state">{c.state}</span>
        </div>
        <div className="cp-claim-meta">
          <span className="cp-confidence" aria-label={`Confidence: ${c.confidence}`}>
            {[1, 2, 3].map(i => <i key={i} data-on={CONF_RANK[c.confidence] >= i} aria-hidden="true" />)}
            <span className="cp-record">{c.confidence}</span>
          </span>
          {c.checks.length > 3
            ? <button type="button" className="cp-claim-toggle" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? null : c.id)}>
                {c.checks.length} checks <span aria-hidden="true">{open === c.id ? '↑' : '↓'}</span>
              </button>
            : <span className="cp-record">{c.checks.length} check{c.checks.length === 1 ? '' : 's'}</span>}
        </div>
        <ul className="cp-checks" hidden={open !== c.id && c.checks.length > 3}>
          {c.checks.map(k => <li key={k.id} className="cp-check-row" data-status={k.status}>
            <i className={`cp-check cp-check--${k.status}`} aria-hidden="true" />
            <span className="cp-check-title">{k.title}</span>
            <span className="cp-record">{k.relation ?? 'tested-by'} · {STATUS_LABEL[k.status]}{k.date ? ` · ${k.date}` : ''}</span>
          </li>)}
        </ul>
      </li>)}
    </ol>
  </Figure>;
}
