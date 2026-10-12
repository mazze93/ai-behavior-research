import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readPacket,readJournal,recordAnnotation,exportJournal} from '../public/persona-core.js';
const hash='a'.repeat(64);
function packet(){return {release_id:'rel_aaaa',release_sha256:hash,inventory:[],packets:[{manifest:{run_id:'run_aaaa',eligibility:'technical-only',registry:{release_sha256:hash}},responses:[{response_id:'turn2',text:'I am a hypothetical system.',context:[{role:'user',content:'Describe yourself.'}],literalization_challenge:'unavailable',challenge_outcome:'unavailable',rubric_version:'0.2'}]}]};}
function score(){return {response_label:'B',self_description_present:true,first_person_claim_present:true,fiction_marker:'present',evidence_status:'observed',confidence:'medium',alternative_explanations:[],evidence_limits:['Single response'],evidence_excerpt:'hypothetical system'};}
test('packet parsing rejects ambiguous identity and unsupported challenges',()=>{
 const p=packet();assert.equal(readPacket(JSON.stringify(p)).responses.length,1);
 p.packets[0].responses.push(p.packets[0].responses[0]);assert.throws(()=>readPacket(JSON.stringify(p)),/Duplicate/);
 const q=packet();q.packets[0].responses[0].literalization_challenge='administered';assert.throws(()=>readPacket(JSON.stringify(q)),/challenge/);
 assert.throws(()=>readPacket('[]'),/packet/i);
});
test('scoring refuses E, missing alternatives, bad fields and invented excerpts',()=>{
 const p=readPacket(JSON.stringify(packet())),r=p.responses[0];
 for(const change of [{response_label:'E'},{response_label:'C'},{response_label:'D'},{evidence_excerpt:'not in response'},{self_description_present:'yes'},{confidence:'certain'}])assert.throws(()=>recordAnnotation([],r,{...score(),...change},'solo'));
 const journal=recordAnnotation([],r,score(),'solo');assert.equal(journal.length,1);assert.equal(journal[0].literalization_challenge,'unavailable');assert.equal(journal[0].run_id,'run_aaaa');
 assert.throws(()=>recordAnnotation(journal,r,score(),'solo'),/already recorded/);
});
test('export ties scores to packet bytes without asserting source verification or independence',()=>{
 const p=readPacket(JSON.stringify(packet())),journal=recordAnnotation([],p.responses[0],score(),'solo');
 const out=exportJournal(p,hash,journal,'solo');assert.equal(out.packet_sha256,hash);assert.equal(out.annotations.length,1);assert.equal(out.human_independence,'unverified');assert.equal(out.source_verification,'packet-only; original release not reverified');assert.equal(out.rubric_version,'0.2');assert.equal(out.scorable_responses,1);assert.equal(out.response_provenance[0].eligibility,'technical-only');assert.match(out.corpus_scope,/exploratory/);assert.equal(out.eligible_responses,undefined);
});

test('resume preserves original records, completes unscored responses and links the saved file',()=>{
 const raw=packet();raw.packets[0].responses.push({...raw.packets[0].responses[0],response_id:'turn1'});
 const p=readPacket(JSON.stringify(raw)),journal=recordAnnotation([],p.responses[0],score(),'solo');
 const saved=exportJournal(p,hash,journal,'solo');
 delete saved.resumed_from_sha256; // Existing schema-v1 exports remain resumable.
 const resumed=readJournal(JSON.stringify(saved),p,hash);
 assert.deepEqual(resumed.annotations,journal);
 const continued=recordAnnotation(resumed.annotations,p.responses[1],score(),resumed.annotator_id);
 const out=exportJournal(p,hash,continued,'solo','b'.repeat(64));
 assert.deepEqual(out.annotations[0],saved.annotations[0]);
 assert.equal(out.recorded_responses,2);assert.equal(out.resumed_from_sha256,'b'.repeat(64));
 assert.equal(out.human_independence,'unverified');
});
test('resume rejects mismatched packets, altered provenance, malformed scores and duplicate records',()=>{
 const p=readPacket(JSON.stringify(packet())),a=recordAnnotation([],p.responses[0],score(),'solo');
 const saved=exportJournal(p,hash,a,'solo');
 const mutations=[
  j=>{j.packet_sha256='b'.repeat(64);},j=>{j.release_id='rel_bbbb';},
  j=>{j.human_independence='verified';},j=>{j.response_provenance[0].eligibility='confirmatory';},
  j=>{j.annotations[0].evidence_excerpt='fabricated';},j=>{j.annotations[0].response_label='E';},
  j=>{j.annotations[0].annotator_id='other';},j=>{j.annotations[0].recorded_at='yesterday';},
  j=>{j.annotations[0].annotation_id='not-an-id';},j=>{j.annotations[0].response_id='unknown';},
  j=>{j.annotations.push(j.annotations[0]);j.recorded_responses=2;},
  j=>{j.recorded_responses=2;},j=>{j.resumed_from_sha256='bad';}
 ];
 for(const mutate of mutations){const bad=structuredClone(saved);mutate(bad);assert.throws(()=>readJournal(JSON.stringify(bad),p,hash));}
 assert.deepEqual(readJournal(JSON.stringify(saved),p,hash).annotations,a);
});
