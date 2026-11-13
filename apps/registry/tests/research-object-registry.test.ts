import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {canonical} from '../src/core';
import type {RunRow, StudyRow} from '../src/core';
import {checkResearchObject} from '../src/research-object';
import {fromRegistry, type RegistryInput} from '../src/research-object-registry';

const template = JSON.parse(fs.readFileSync('public/protocol-template.json', 'utf8'));
const HASH = 'a'.repeat(64);
const QUESTION = {kind: 'repo' as const, locator: 'studies/identity-dissolution/README.md'};

function study(over: Partial<StudyRow> = {}, phase = 'pilot'): StudyRow {
  return {id: 'study_ABC-1', title: template.title, protocol: canonical({...template, phase}), sha256: HASH,
    created_at: '2026-10-01T09:00:00.000Z', source_version: 'registry-0.2.0', parent_id: null, amendment: null, ...over};
}
function run(ordinal: number, status: string, over: Partial<RunRow> = {}): RunRow {
  const started = status === 'pending' ? null : `2026-10-02T10:0${ordinal}:00.000Z`;
  return {id: `run_${ordinal}`, study_id: 'study_ABC-1', ordinal, job: '{}', status, started_at: started,
    finished_at: status === 'complete' ? `2026-10-02T10:1${ordinal}:00.000Z` : null,
    result: status === 'complete' ? '{}' : null, error: null, excluded_reason: null, ...over};
}
const base = (over: Partial<RegistryInput> = {}): RegistryInput =>
  ({study: study(), runs: [], releases: [], investigator: 'A. Person', question: QUESTION, ...over});

test('a stored study with no runs is a frozen protocol and nothing more', () => {
  const o = fromRegistry(base());
  assert.deepEqual(checkResearchObject(o), []);
  assert.equal(o.id, 'study-abc-1');
  assert.equal(o.stages.protocol.status, 'frozen');
  assert.equal(o.stages.protocol.at, '2026-10-01T09:00:00.000Z');
  assert.equal(o.stages.execution.status, 'absent');
  assert.equal(o.evidence_grade, 'none', 'a pilot protocol that has not run is not pilot evidence');
});

test('stage dates come from run records, and failures are counted apart from results', () => {
  const runs = [run(1, 'complete'), run(2, 'failed'), run(3, 'complete', {excluded_reason: 'budget'}), run(4, 'pending')];
  const o = fromRegistry(base({runs, releases: [{id: 'rel_1', study_id: 'study_ABC-1', created_at: '2026-10-03T00:00:00.000Z', sha256: HASH}]}));
  assert.deepEqual(checkResearchObject(o), []);
  assert.equal(o.stages.execution.at, '2026-10-02T10:01:00.000Z');
  assert.equal(o.stages.execution.limits![0], '4 planned, 2 complete, 1 failed or interrupted, 1 excluded.');
  assert.equal(o.stages.observation.limits![0], '1 of 4 planned runs produced an analysable record.');
  assert.deepEqual(o.stages.observation.refs, [{kind: 'release', locator: 'rel_1', sha256: HASH}]);
  assert.equal(o.evidence_grade, 'pilot');
});

test('the declared phase caps the grade, and so do the stages', () => {
  const runs = [run(1, 'complete')];
  assert.equal(fromRegistry(base({study: study({}, 'smoke'), runs})).evidence_grade, 'smoke');
  assert.equal(fromRegistry(base({study: study({}, 'confirmatory'), runs})).evidence_grade, 'pilot', 'no analysis is recorded in the registry');
  assert.equal(fromRegistry(base({runs: [run(1, 'failed')]})).stages.observation.status, 'absent');
});

test('a derived study names its parent and the kind of derivation', () => {
  assert.equal(fromRegistry(base()).derived_from, undefined);
  assert.deepEqual(fromRegistry(base({study: study({parent_id: 'study_P'})})).derived_from, {id: 'study-p', version: 'registry', relation: 'fork'});
  assert.equal(fromRegistry(base({study: study({parent_id: 'study_P', amendment: 'Shorter prompts'})})).derived_from!.relation, 'amendment');
});

test('a study with no stated question does not pass the contract', () => {
  const findings = checkResearchObject(fromRegistry(base({question: undefined})));
  assert(findings.length > 0 && findings.every(f => f.code === 'stage-order'));
});
