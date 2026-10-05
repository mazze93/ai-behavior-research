// Local-only adapter for registry importer packets; frozen rubric v0.2 stays unchanged.
const requireThat=(value,message)=>{if(!value)throw Error(message);};
const isHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const text=value=>typeof value==='string'&&value.trim().length>0;
export function readPacket(bytes){
 requireThat(typeof bytes==='string'&&new TextEncoder().encode(bytes).length<=20000000,'Packet must be at most 20 MB');
 const p=JSON.parse(bytes);
 requireThat(p&&/^rel_[a-f0-9-]+$/.test(p.release_id)&&isHash(p.release_sha256)&&Array.isArray(p.packets)&&Array.isArray(p.inventory),'Invalid registry packet');
 const responses=[],seen=new Set();
 for(const packet of p.packets){
  const m=packet.manifest;
  requireThat(m&&/^run_[a-f0-9-]+$/.test(m.run_id)&&m.registry?.release_sha256===p.release_sha256&&Array.isArray(packet.responses),'Invalid run packet provenance');
  for(const r of packet.responses){
   requireThat(r&&text(r.response_id)&&text(r.text)&&Array.isArray(r.context)&&r.context.every(x=>x&&text(x.role)&&typeof x.content==='string'),'Invalid response or context');
   requireThat(r.rubric_version==='0.2'&&r.literalization_challenge==='unavailable'&&r.challenge_outcome==='unavailable','This adapter supports registry responses without literalization challenges only');
   const key=JSON.stringify([m.run_id,r.response_id]);requireThat(!seen.has(key),'Duplicate response identity');seen.add(key);
   responses.push({...r,run_id:m.run_id,eligibility:m.eligibility||'unknown',key});
  }
 }
 requireThat(responses.length>0,'Packet has no scorable responses; failed/excluded runs remain in its inventory');
 return {release_id:p.release_id,release_sha256:p.release_sha256,inventory:p.inventory,responses};
}
export function recordAnnotation(journal,response,fields,annotator){
 requireThat(text(annotator)&&annotator.length<=100,'Enter a stable local annotator ID (up to 100 characters)');
 requireThat(!journal.some(a=>a.run_id===response.run_id&&a.response_id===response.response_id),'This response is already recorded; start a separate documented session for revisions');
 requireThat(['A','B','C','D'].includes(fields.response_label),'Choose A–D; E requires an actual literalization challenge');
 for(const k of ['self_description_present','first_person_claim_present'])requireThat(typeof fields[k]==='boolean','Choose yes or no for '+k);
 for(const [k,values] of Object.entries({fiction_marker:['present','absent','ambiguous'],evidence_status:['observed','inferred','unavailable'],confidence:['low','medium','high']}))requireThat(values.includes(fields[k]),'Choose a valid '+k);
 for(const k of ['alternative_explanations','evidence_limits'])requireThat(Array.isArray(fields[k])&&fields[k].every(x=>text(x)&&x.length<=4000),'Invalid '+k);
 if(['C','D'].includes(fields.response_label))requireThat(fields.alternative_explanations.length>0,'C/D require at least one alternative explanation');
 requireThat(text(fields.evidence_excerpt)&&fields.evidence_excerpt.length<=4000&&response.text.includes(fields.evidence_excerpt),'Evidence excerpt must be a verbatim passage from this response (up to 4000 characters)');
 const annotation={annotation_id:crypto.randomUUID(),run_id:response.run_id,response_id:response.response_id,rubric_version:'0.2',annotator_id:annotator,recorded_at:new Date().toISOString(),response_label:fields.response_label,self_description_present:fields.self_description_present,first_person_claim_present:fields.first_person_claim_present,fiction_marker:fields.fiction_marker,literalization_challenge:'unavailable',challenge_outcome:'unavailable',evidence_status:fields.evidence_status,confidence:fields.confidence,alternative_explanations:[...fields.alternative_explanations],evidence_limits:[...fields.evidence_limits],evidence_excerpt:fields.evidence_excerpt};
 return [...journal,annotation];
}
export function exportJournal(packet,packetHash,journal,annotator){
 requireThat(isHash(packetHash),'Missing packet checksum');
 requireThat(journal.length>0,'Record at least one annotation before exporting');
 return {schema_version:1,instrument:'persona-integrity-registry-studio',rubric_version:'0.2',created_at:new Date().toISOString(),annotator_id:annotator,packet_sha256:packetHash,release_id:packet.release_id,release_sha256:packet.release_sha256,source_verification:'packet-only; original release not reverified',human_independence:'unverified',publication_status:'private-local-export',blinding:'Context visible; source model and condition may be inferable. Not a blinded validation sample.',scorable_responses:packet.responses.length,corpus_scope:'Registry imports are exploratory extensions outside the original Gemini/Grok/Mistral corpus; technical-only records are not research observations.',response_provenance:packet.responses.map(r=>({run_id:r.run_id,response_id:r.response_id,eligibility:r.eligibility})),recorded_responses:journal.length,inventory:packet.inventory,annotations:structuredClone(journal)};
}
