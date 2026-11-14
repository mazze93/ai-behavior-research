/**
 * Research object contract, v0.1.
 *
 * A research object links the stages of one investigation:
 * question → hypothesis → protocol → execution → observation → analysis →
 * claim → review → publication. This module is pure: it reads a candidate
 * object and returns findings. It performs no I/O and stores nothing.
 *
 * What a pass means: the record is internally consistent and claims no more
 * than its own stages support. It does not mean the cited files exist, that a
 * hash matches, or that the research is correct. A SHA-256 identifies bytes.
 *
 * Specification and worked examples: docs/research-object/README.md
 */

// ---- Vocabulary -----------------------------------------------------------

export const SCHEMA = 'research-object/v0.1';

export const STAGES = [
  'question', 'hypothesis', 'protocol', 'execution', 'observation',
  'analysis', 'claim', 'review', 'publication',
] as const;
export type Stage = typeof STAGES[number];

/** `frozen` is `recorded` plus a commitment not to change it. */
export const STATUSES = ['absent', 'draft', 'recorded', 'frozen', 'not-applicable'] as const;
export type Status = typeof STATUSES[number];

/** Ordered weakest to strongest. `none` means nothing has been executed. */
export const GRADES = ['none', 'smoke', 'pilot', 'exploratory', 'confirmatory', 'replicated'] as const;
export type Grade = typeof GRADES[number];

export const REF_KINDS = ['repo', 'release', 'url', 'private'] as const;
export const ACTOR_KINDS = ['human', 'model', 'agent'] as const;
export const DERIVATIONS = ['fork', 'amendment', 'replication'] as const;
export const EXTERNAL_EVENTS = ['peer-review', 'doi', 'independent-replication', 'outside-reader'] as const;

/** A stage may be recorded only when the stages it rests on are settled. */
export const REQUIRES: Record<Stage, Stage[]> = {
  question: [],
  hypothesis: ['question'],
  protocol: ['question'],
  execution: ['protocol'],
  observation: ['execution'],
  analysis: ['observation'],
  claim: ['question'],
  review: ['claim'],
  publication: ['claim', 'review'],
};

// ---- Types ----------------------------------------------------------------

export type Ref = { kind: typeof REF_KINDS[number]; locator: string; sha256?: string };
export type StageRecord = { status: Status; at?: string; refs?: Ref[]; limits?: string[]; reason?: string };
export type Actor = { name: string; kind: typeof ACTOR_KINDS[number]; role: string };
export type Claim = { id: string; statement: string; evidence: Ref[]; counter_evidence?: Ref[]; limits: string[] };
export type ExternalEvent = { kind: typeof EXTERNAL_EVENTS[number]; at: string; by: string; locator: string };
export type Derivation = { id: string; version: string; relation: typeof DERIVATIONS[number] };
export type PublicationDecision = { decision: 'publish' | 'withhold'; by: string; at: string };

export type ResearchObject = {
  schema: string;
  id: string;
  title: string;
  module: string;
  version: string;
  evidence_grade: Grade;
  derived_from?: Derivation;
  authors: Actor[];
  stages: Record<Stage, StageRecord>;
  claims: Claim[];
  external_events: ExternalEvent[];
  publication_decision?: PublicationDecision;
};

export type Finding = { code: string; where: string; message: string };

// ---- Small predicates -----------------------------------------------------

const ID = /^[a-z0-9][a-z0-9-]{1,79}$/;
const DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.+Z-]+)?$/;
const SHA256 = /^[0-9a-f]{64}$/;

const isText = (value: unknown, max = 2000): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const isDate = (value: unknown): value is string => typeof value === 'string' && DATE.test(value);
const isSettled = (status: Status): boolean => status === 'recorded' || status === 'frozen';
const day = (iso: string): string => iso.slice(0, 10);

// ---- Checks, one concern each ---------------------------------------------

function checkRef(ref: Ref, where: string): Finding[] {
  const out: Finding[] = [];
  if (!ref || !REF_KINDS.includes(ref.kind) || !isText(ref.locator, 500)) {
    return [{ code: 'ref-shape', where, message: 'A reference needs a known kind and a locator.' }];
  }
  if (ref.sha256 !== undefined && !SHA256.test(ref.sha256)) {
    out.push({ code: 'ref-hash', where, message: `sha256 for ${ref.locator} is not 64 lowercase hex characters.` });
  }
  if (ref.kind === 'release' && ref.sha256 === undefined) {
    out.push({ code: 'ref-hash', where, message: `Release ${ref.locator} must carry its bundle sha256.` });
  }
  return out;
}

function checkIdentity(o: ResearchObject): Finding[] {
  const out: Finding[] = [];
  const bad = (message: string) => out.push({ code: 'identity', where: 'object', message });
  if (o.schema !== SCHEMA) bad(`schema must be ${SCHEMA}.`);
  if (!ID.test(String(o.id))) bad('id must be lowercase letters, digits and hyphens.');
  for (const key of ['title', 'module', 'version'] as const) if (!isText(o[key], 200)) bad(`${key} is required.`);
  if (!GRADES.includes(o.evidence_grade)) bad('evidence_grade is not a known grade.');
  const authors = Array.isArray(o.authors) ? o.authors : [];
  if (!authors.every(a => a && isText(a.name, 200) && isText(a.role, 200) && ACTOR_KINDS.includes(a.kind))) {
    bad('Every author needs a name, a role and a kind of human, model or agent.');
  }
  if (!authors.some(a => a?.kind === 'human')) bad('At least one author must be human.');
  const d = o.derived_from;
  if (d !== undefined && !(d && isText(d.id, 80) && isText(d.version, 80) && DERIVATIONS.includes(d.relation))) {
    bad('derived_from needs the source id, its version and a relation of fork, amendment or replication.');
  }
  return out;
}

function checkStageShape(stage: Stage, record: StageRecord | undefined): Finding[] {
  const out: Finding[] = [];
  const bad = (message: string) => out.push({ code: 'stage-shape', where: stage, message });
  if (!record || !STATUSES.includes(record.status)) return [{ code: 'stage-shape', where: stage, message: 'Stage is missing or has an unknown status.' }];
  if (record.status === 'not-applicable' && !isText(record.reason)) bad('A stage marked not-applicable must say why.');
  if (isSettled(record.status)) {
    if (!isDate(record.at)) bad('A recorded or frozen stage needs an ISO date in `at`.');
    if (!Array.isArray(record.refs) || record.refs.length === 0) bad('A recorded or frozen stage needs at least one reference.');
  }
  if (record.limits !== undefined && !(Array.isArray(record.limits) && record.limits.every(l => isText(l)))) bad('limits must be non-empty strings.');
  for (const ref of record.refs ?? []) out.push(...checkRef(ref, stage));
  return out;
}

function checkStageDependencies(stages: Record<Stage, StageRecord>): Finding[] {
  const out: Finding[] = [];
  for (const stage of STAGES) {
    if (!isSettled(stages[stage].status)) continue;
    for (const needed of REQUIRES[stage]) {
      const status = stages[needed].status;
      if (isSettled(status) || status === 'not-applicable') continue;
      out.push({ code: 'stage-order', where: stage, message: `${stage} is ${stages[stage].status} but ${needed} is ${status}.` });
    }
  }
  return out;
}

/**
 * The strongest grade the recorded stages can support.
 * Confirmatory requires the hypothesis and protocol to be frozen on or before
 * the day execution began. Replicated requires a recorded outside replication.
 */
export function gradeCeiling(o: Pick<ResearchObject, 'stages' | 'external_events'>): Grade {
  const s = o.stages;
  if (!isSettled(s.execution.status)) return 'none';
  if (!isSettled(s.observation.status) || !isSettled(s.analysis.status)) return 'pilot';
  const frozenFirst = [s.hypothesis, s.protocol].every(r =>
    r.status === 'frozen' && isDate(r.at) && isDate(s.execution.at) && day(r.at) <= day(s.execution.at));
  if (!frozenFirst) return 'exploratory';
  const replicated = (o.external_events ?? []).some(e => e.kind === 'independent-replication');
  return replicated ? 'replicated' : 'confirmatory';
}

function checkGrade(o: ResearchObject): Finding[] {
  const ceiling = gradeCeiling(o);
  if (GRADES.indexOf(o.evidence_grade) <= GRADES.indexOf(ceiling)) return [];
  return [{ code: 'grade-ceiling', where: 'object', message: `evidence_grade is ${o.evidence_grade} but the recorded stages support at most ${ceiling}.` }];
}

function checkClaims(o: ResearchObject): Finding[] {
  const out: Finding[] = [];
  const claims = Array.isArray(o.claims) ? o.claims : [];
  const settled = isSettled(o.stages.claim.status);
  if (settled && claims.length === 0) out.push({ code: 'claim-evidence', where: 'claim', message: 'The claim stage is recorded but no claims are listed.' });
  if (!settled && claims.length > 0) out.push({ code: 'claim-evidence', where: 'claim', message: 'Claims are listed but the claim stage is not recorded.' });
  for (const claim of claims) {
    const where = `claim:${claim?.id ?? '?'}`;
    if (!claim || !ID.test(String(claim.id)) || !isText(claim.statement)) {
      out.push({ code: 'claim-evidence', where, message: 'A claim needs an id and a statement.' });
      continue;
    }
    if (!Array.isArray(claim.evidence) || claim.evidence.length === 0) out.push({ code: 'claim-evidence', where, message: 'A claim must link at least one piece of evidence.' });
    if (!Array.isArray(claim.limits) || claim.limits.length === 0 || !claim.limits.every(l => isText(l))) out.push({ code: 'claim-evidence', where, message: 'A claim must state at least one limit.' });
    for (const ref of [...(claim.evidence ?? []), ...(claim.counter_evidence ?? [])]) out.push(...checkRef(ref, where));
  }
  return out;
}

function checkExternalEvents(o: ResearchObject): Finding[] {
  const events = Array.isArray(o.external_events) ? o.external_events : [];
  return events
    .filter(e => !(e && EXTERNAL_EVENTS.includes(e.kind) && isDate(e.at) && isText(e.by, 200) && isText(e.locator, 500)))
    .map(e => ({ code: 'external-event', where: `event:${e?.kind ?? '?'}`, message: 'An external event needs a known kind, a date, who performed it and where its record is.' }));
}

/** Publication is a human decision, recorded as such; it is never inferred. */
function checkPublication(o: ResearchObject): Finding[] {
  const out: Finding[] = [];
  const bad = (message: string) => out.push({ code: 'publication', where: 'publication', message });
  const decision = o.publication_decision;
  if (decision !== undefined) {
    const human = (o.authors ?? []).some(a => a.kind === 'human' && a.name === decision.by);
    if (!['publish', 'withhold'].includes(decision.decision) || !isDate(decision.at)) bad('publication_decision needs a decision and a date.');
    if (!human) bad('publication_decision.by must name a human author of this object.');
  }
  if (isSettled(o.stages.publication.status) && decision?.decision !== 'publish') bad('Publication is recorded without a publish decision.');
  return out;
}

// ---- Entry point ----------------------------------------------------------

/** Returns every finding. An empty array means the object is consistent. */
export function checkResearchObject(candidate: unknown): Finding[] {
  if (!candidate || typeof candidate !== 'object') return [{ code: 'identity', where: 'object', message: 'A research object is required.' }];
  const o = candidate as ResearchObject;
  const shape = STAGES.flatMap(stage => checkStageShape(stage, o.stages?.[stage]));
  const identity = checkIdentity(o);
  // Later checks read stage statuses, so stop here if any stage is malformed.
  if (shape.some(f => f.message.startsWith('Stage is missing'))) return [...identity, ...shape];
  return [
    ...identity, ...shape,
    ...checkStageDependencies(o.stages), ...checkGrade(o),
    ...checkClaims(o), ...checkExternalEvents(o), ...checkPublication(o),
  ];
}
