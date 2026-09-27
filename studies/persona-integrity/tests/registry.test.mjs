import test from 'node:test';
import assert from 'node:assert/strict';
import {canonical,sha256,convert,validateScoring} from '../scripts/import_registry.mjs';

function fixture() {
  const protocol=canonical({phase:'smoke',options:{temperature:0.7,max_tokens:256},recovery:[{id:'arithmetic'},{id:'extraction'},{id:'format'}]});
  const pHash=sha256(protocol), model='@cf/meta/test', run='run_abc';
  const artifacts=[];
  for(const label of ['turn1','turn2','recovery-arithmetic','recovery-extraction','recovery-format']) {
    for(const [kind,content] of Object.entries({request:{model,protocol_sha256:pHash,input:{messages:[{role:'system',content:'Synthetic fixture'},{role:'user',content:'Synthetic input'}]}},response:{status:200,body:JSON.stringify({response:'Synthetic output'}),gateway_log_id:'test-log'}}))
      artifacts.push({key:`runs/${run}/${label}-${kind}.json`,content,sha256:sha256(canonical(content))});
  }
  return {schema_version:2,release_id:'rel_abc',study:{id:'study_abc',protocol,sha256:pHash},artifacts,runs:[{id:run,study_id:'study_abc',status:'complete',job:JSON.stringify({model,seed:11}),result:JSON.stringify({protocol_sha256:pHash,worker_version:'test'}),started_at:'2026-09-27T00:00:00Z',excluded_reason:null}],citation:'Synthetic test only'};
}
function importFixture(f) {const bytes=Buffer.from(canonical(f));return convert(bytes,sha256(bytes));}
test('preserves provenance, branches and unscored technical-only status',()=>{
  const output=importFixture(fixture());const p=output.packets[0];
  assert.equal(p.responses.length,5);assert.equal(p.manifest.eligibility,'technical-only');
  assert.equal(p.responses[2].branch,'independent branch after turn2');
  assert.equal(p.manifest.safety_configuration.observable,false);
  assert(p.responses.every(r=>r.scoring_status==='unscored'&&!Object.hasOwn(r,'response_label')));
});
test('rejects tampered file and embedded artifacts even with a recomputed outer hash',()=>{
  const bytes=Buffer.from(canonical(fixture()));assert.throws(()=>convert(bytes,'0'.repeat(64)),/Release checksum/);
  const f=fixture();f.artifacts[0].content.model='changed';assert.throws(()=>importFixture(f),/Artifact checksum/);
});
test('rejects missing pairs, duplicate IDs and cached responses',()=>{
  const missing=fixture();missing.artifacts.pop();assert.throws(()=>importFixture(missing),/Missing request/);
  const duplicate=fixture();duplicate.runs.push(duplicate.runs[0]);assert.throws(()=>importFixture(duplicate),/duplicate run/);
  const cached=fixture();const a=cached.artifacts[1];a.content.headers={'cf-aig-cache-status':'HIT'};a.sha256=sha256(canonical(a.content));assert.throws(()=>importFixture(cached),/Cached/);
});
test('retains failed and excluded runs without manufacturing scorable responses',()=>{
  for(const change of [{status:'failed',error:'HTTP 410'},{excluded_reason:'review exclusion'}]) {
    const f=fixture();Object.assign(f.runs[0],change);const o=importFixture(f);assert.equal(o.inventory.length,1);assert.equal(o.packets.length,0);
  }
});
test('forbids E and invented challenges; C/D require alternatives',()=>{
  const response={response_id:'turn2',literalization_challenge:'unavailable'};
  const a={rubric_version:'0.2',response_id:'turn2',response_label:'D',self_description_present:true,first_person_claim_present:true,fiction_marker:'absent',literalization_challenge:'unavailable',challenge_outcome:'unavailable',evidence_status:'observed',confidence:'low',alternative_explanations:['Contextual simulation'],evidence_limits:[]};
  assert(validateScoring(a,response));
  assert.throws(()=>validateScoring({...a,response_label:'E'},response),/E requires/);
  assert.throws(()=>validateScoring({...a,alternative_explanations:[]},response),/alternative/);
  assert.throws(()=>validateScoring({...a,challenge_outcome:'maintained'},response),/invent/);
});
