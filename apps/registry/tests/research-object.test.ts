import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {checkResearchObject, gradeCeiling, STAGES, type ResearchObject} from '../src/research-object';

const REPO_ROOT = path.resolve('../..');
const EXAMPLES = path.join(REPO_ROOT, 'docs/research-object/examples');
const load = (name: string): ResearchObject => JSON.parse(fs.readFileSync(path.join(EXAMPLES, name), 'utf8'));
const codes = (o: unknown) => checkResearchObject(o).map(f => f.code);

/** A complete, consistent object at confirmatory grade, used as the base for mutations. */
function confirmatory(): ResearchObject {
  const ref = [{kind: 'url' as const, locator: 'https://example.org/record'}];
  const at = (date: string, status: 'recorded' | 'frozen' = 'recorded') => ({status, at: date, refs: ref});
  return {
    schema: 'research-object/v0.1', id: 'fixture', title: 'Fixture', module: 'fixture', version: '1',
    evidence_grade: 'confirmatory',
    authors: [{name: 'A. Person', kind: 'human', role: 'investigator'}, {name: 'A model', kind: 'model', role: 'assistant'}],
    stages: {
      question: at('2026-01-01'), hypothesis: at('2026-01-02', 'frozen'), protocol: at('2026-01-02', 'frozen'),
      execution: at('2026-01-03'), observation: at('2026-01-04'), analysis: at('2026-01-05'),
      claim: at('2026-01-06'), review: at('2026-01-07'), publication: at('2026-01-08'),
    },
    claims: [{id: 'c1', statement: 'A bounded statement.', evidence: ref, limits: ['One model, one prompt set.']}],
    external_events: [],
    publication_decision: {decision: 'publish', by: 'A. Person', at: '2026-01-08'},
  };
}

test('every example is consistent and its repository references resolve', () => {
  const files = fs.readdirSync(EXAMPLES).filter(f => f.endsWith('.json'));
  assert.equal(files.length, 3);
  for (const file of files) {
    const object = load(file);
    assert.deepEqual(checkResearchObject(object), [], file);
    const refs = [...STAGES.flatMap(s => object.stages[s].refs ?? []), ...object.claims.flatMap(c => c.evidence)];
    for (const ref of refs.filter(r => r.kind === 'repo')) assert(fs.existsSync(path.join(REPO_ROOT, ref.locator)), `${file}: ${ref.locator}`);
  }
});

test('example hashes match the bytes in this repository', async () => {
  for (const file of fs.readdirSync(EXAMPLES).filter(f => f.endsWith('.json'))) {
    const object = load(file);
    const refs = [...STAGES.flatMap(s => object.stages[s].refs ?? []), ...object.claims.flatMap(c => c.evidence)];
    for (const ref of refs.filter(r => r.kind === 'repo' && r.sha256)) {
      const digest = await crypto.subtle.digest('SHA-256', fs.readFileSync(path.join(REPO_ROOT, ref.locator)));
      const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
      assert.equal(hex, ref.sha256, `${file}: ${ref.locator}`);
    }
  }
});

test('the examples sit at the grades their records support', () => {
  assert.equal(gradeCeiling(load('identity-dissolution.json')), 'exploratory');
  assert.equal(load('identity-dissolution.json').evidence_grade, 'smoke');
  assert.equal(gradeCeiling(load('persona-integrity.json')), 'none');
  assert.equal(gradeCeiling(load('intentional-fragility.json')), 'none');
});

test('a complete confirmatory object passes', () => assert.deepEqual(checkResearchObject(confirmatory()), []));

test('a grade cannot exceed what the stages support', () => {
  const late = confirmatory(); late.stages.protocol.at = '2026-01-04';
  assert(codes(late).includes('grade-ceiling'), 'protocol frozen after execution is not confirmatory');
  const unfrozen = confirmatory(); unfrozen.stages.hypothesis.status = 'recorded';
  assert(codes(unfrozen).includes('grade-ceiling'));
  const claimed = confirmatory(); claimed.evidence_grade = 'replicated';
  assert(codes(claimed).includes('grade-ceiling'), 'replication must be a recorded outside event');
  claimed.external_events = [{kind: 'independent-replication', at: '2026-02-01', by: 'Another lab', locator: 'https://example.org/replication'}];
  assert.deepEqual(checkResearchObject(claimed), []);
  const unrun = confirmatory(); unrun.stages.execution = {status: 'absent'};
  assert.equal(gradeCeiling(unrun), 'none');
});

test('a stage cannot be recorded over an unsettled stage it rests on', () => {
  const o = confirmatory(); o.stages.observation = {status: 'draft'}; o.evidence_grade = 'pilot';
  assert(codes(o).includes('stage-order'));
  const skipped = confirmatory(); skipped.stages.review = {status: 'not-applicable'};
  assert(codes(skipped).includes('stage-shape'), 'not-applicable needs a reason');
});

test('claims need evidence and limits, and cannot outrun the claim stage', () => {
  const bare = confirmatory(); bare.claims[0].evidence = [];
  assert(codes(bare).includes('claim-evidence'));
  const certain = confirmatory(); certain.claims[0].limits = [];
  assert(codes(certain).includes('claim-evidence'));
  const early = load('persona-integrity.json'); early.claims = confirmatory().claims;
  assert(codes(early).includes('claim-evidence'));
});

test('publication is an explicit human decision', () => {
  const inferred = confirmatory(); delete inferred.publication_decision;
  assert(codes(inferred).includes('publication'));
  const byModel = confirmatory(); byModel.publication_decision!.by = 'A model';
  assert(codes(byModel).includes('publication'));
  const noHuman = confirmatory(); noHuman.authors = [noHuman.authors[1]];
  assert(codes(noHuman).includes('identity'));
});

test('references and external events are shape-checked, not trusted', () => {
  const hash = confirmatory(); hash.stages.protocol.refs = [{kind: 'release', locator: 'rel_x'}];
  assert(codes(hash).includes('ref-hash'));
  const event = confirmatory(); event.external_events = [{kind: 'doi', at: 'soon', by: '', locator: ''}];
  assert(codes(event).includes('external-event'));
  assert.deepEqual(codes(null), ['identity']);
  assert(codes({schema: 'research-object/v0.1'}).includes('stage-shape'));
});
