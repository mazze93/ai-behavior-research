/**
 * Builds a research object from registry rows.
 *
 * Pure: rows in, object out. No database access happens here, and no route
 * calls this yet. It exists so that stage dates come from the registry's own
 * records (when a protocol was stored, when a run started) and not from the
 * date of a document written afterwards.
 *
 * The registry knows less than the contract asks for. It stores no research
 * question and no author, so the caller must supply them. Without a question
 * the built object fails `checkResearchObject`, which is the intended result.
 * Analysis, claims, review and publication happen outside the registry and
 * are always absent here.
 */
import type { Protocol, RunRow, StudyRow } from './core';
import { GRADES, gradeCeiling, SCHEMA, type Grade, type Ref, type ResearchObject, type StageRecord } from './research-object';

export type ReleaseRow = { id: string; study_id: string; created_at: string; sha256: string };
export type RegistryInput = {
  study: StudyRow;
  runs: RunRow[];
  releases: ReleaseRow[];
  /** Named human investigator. The registry has no author field. */
  investigator: string;
  /** Where the research question is stated. The registry has no question field. */
  question?: Ref;
};

const ABSENT: StageRecord = { status: 'absent' };
const STARTED = ['complete', 'failed', 'interrupted'];

/** Registry ids contain underscores; object ids allow lowercase, digits and hyphens. */
const objectId = (studyId: string): string => studyId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const earliest = (dates: (string | null)[]): string | undefined => dates.filter((d): d is string => !!d).sort()[0];
const weaker = (a: Grade, b: Grade): Grade => (GRADES.indexOf(a) <= GRADES.indexOf(b) ? a : b);

/** Counts are reported separately so a failed or excluded run is never read as a zero. */
function runCounts(runs: RunRow[]): string {
  const count = (test: (r: RunRow) => boolean) => runs.filter(test).length;
  return `${runs.length} planned, ${count(r => r.status === 'complete')} complete, `
    + `${count(r => ['failed', 'interrupted'].includes(r.status))} failed or interrupted, ${count(r => !!r.excluded_reason)} excluded.`;
}

function executionStages(input: RegistryInput, studyRef: Ref): Pick<ResearchObject['stages'], 'execution' | 'observation'> {
  const started = input.runs.filter(r => STARTED.includes(r.status) && r.started_at);
  if (started.length === 0) return { execution: ABSENT, observation: ABSENT };
  const releases: Ref[] = input.releases.map(r => ({ kind: 'release', locator: r.id, sha256: r.sha256 }));
  const execution: StageRecord = { status: 'recorded', at: earliest(started.map(r => r.started_at)), refs: [studyRef], limits: [runCounts(input.runs)] };
  const observed = input.runs.filter(r => r.status === 'complete' && r.result && !r.excluded_reason);
  if (observed.length === 0) return { execution, observation: ABSENT };
  const finished = earliest(observed.map(r => r.finished_at)) ?? execution.at;
  return { execution, observation: { status: 'recorded', at: finished, refs: releases.length ? releases : [studyRef], limits: [`${observed.length} of ${input.runs.length} planned runs produced an analysable record.`] } };
}

export function fromRegistry(input: RegistryInput): ResearchObject {
  const { study } = input;
  const protocol = JSON.parse(study.protocol) as Protocol;
  const studyRef: Ref = { kind: 'private', locator: `registry study ${study.id}`, sha256: study.sha256 };
  // The registry stores a protocol once, with its hash, and never updates it.
  const frozen: StageRecord = { status: 'frozen', at: study.created_at, refs: [studyRef], limits: ['Frozen by the registry at this time. Not an external preregistration.'] };
  const stages: ResearchObject['stages'] = {
    question: input.question ? { status: 'recorded', at: study.created_at, refs: [input.question] } : ABSENT,
    hypothesis: frozen, protocol: frozen,
    ...executionStages(input, studyRef),
    analysis: ABSENT, claim: ABSENT, review: ABSENT, publication: ABSENT,
  };
  const derived = study.parent_id
    ? { derived_from: { id: objectId(study.parent_id), version: 'registry', relation: study.amendment ? 'amendment' as const : 'fork' as const } }
    : {};
  // The protocol declares its own phase; the object may not claim more than its stages support.
  const ceiling = gradeCeiling({ stages, external_events: [] });
  return {
    schema: SCHEMA, id: objectId(study.id), title: study.title, module: 'factorial-model-experiment', version: study.source_version,
    evidence_grade: weaker(protocol.phase, ceiling), ...derived,
    authors: [{ name: input.investigator, kind: 'human', role: 'investigator' }],
    stages, claims: [], external_events: [],
  };
}
