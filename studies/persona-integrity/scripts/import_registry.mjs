#!/usr/bin/env node
/** Import a reviewed registry bundle into a private, unscored evidence packet. */
import {createHash} from 'node:crypto';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}
function requireThat(condition, message) { if (!condition) throw new Error(message); }
function responseText(body) {
  const data = JSON.parse(body);
  const text = data.response ?? data.result?.response ?? data.choices?.[0]?.message?.content;
  requireThat(typeof text === 'string', 'Missing response text');
  return text;
}

export function convert(bytes, expectedHash) {
  requireThat(/^[a-f0-9]{64}$/.test(expectedHash), 'Supply the release SHA-256 from a separately retrieved release record');
  requireThat(bytes.length <= 20_000_000, 'Bundle exceeds 20 MB');
  requireThat(sha256(bytes) === expectedHash, 'Release checksum mismatch');
  const bundle = JSON.parse(bytes);
  requireThat(bundle.schema_version === 2, 'Unsupported registry schema');
  requireThat(/^rel_[a-f0-9-]+$/.test(bundle.release_id), 'Invalid release ID');
  requireThat(sha256(bundle.study.protocol) === bundle.study.sha256, 'Protocol checksum mismatch');
  const protocol = JSON.parse(bundle.study.protocol);
  const artifacts = new Map();
  for (const a of bundle.artifacts) {
    requireThat(!artifacts.has(a.key), 'Duplicate artifact key');
    requireThat(sha256(canonical(a.content)) === a.sha256, 'Artifact checksum mismatch: ' + a.key);
    artifacts.set(a.key, a);
  }
  const packets = [], inventory = [], seen = new Set();
  for (const run of bundle.runs) {
    requireThat(/^run_[a-f0-9-]+$/.test(run.id) && !seen.has(run.id), 'Invalid or duplicate run ID');
    seen.add(run.id);
    requireThat(run.study_id === bundle.study.id, 'Run belongs to another study');
    inventory.push({run_id:run.id,status:run.status,error:run.error,excluded_reason:run.excluded_reason});
    if (run.status !== 'complete' || run.excluded_reason) continue;
    const job = JSON.parse(run.job), result = JSON.parse(run.result);
    requireThat(result.protocol_sha256 === bundle.study.sha256, 'Run protocol mismatch');
    const labels = ['turn1', 'turn2', ...protocol.recovery.map(p => 'recovery-' + p.id)];
    requireThat(labels.length === 5 && new Set(labels).size === 5, 'Unsupported conversation shape');
    const responses = labels.map(label => {
      const request = artifacts.get(`runs/${run.id}/${label}-request.json`);
      const response = artifacts.get(`runs/${run.id}/${label}-response.json`);
      requireThat(request && response, 'Missing request/response pair');
      requireThat(request.content.protocol_sha256 === bundle.study.sha256 && request.content.model === job.model, 'Request provenance mismatch');
      requireThat(response.content.status === 200, 'Completed run contains unsuccessful response');
      requireThat((response.content.headers?.['cf-aig-cache-status'] || '').toUpperCase() !== 'HIT', 'Cached response');
      return {response_id:label,context:request.content.input.messages,text:responseText(response.content.body),
        request_sha256:request.sha256,response_sha256:response.sha256,gateway_log_id:response.content.gateway_log_id ?? null,
        branch:label.startsWith('recovery-')?'independent branch after turn2':'sequential',
        literalization_challenge:'unavailable',challenge_outcome:'unavailable',
        scoring_status:'unscored',rubric_version:'0.2'};
    });
    const manifest = {
      run_id:run.id,model_family:job.model.includes('/meta/')?'Llama':'other',model_identifier:job.model,
      interface:'api',captured_at:run.started_at,turn_count:responses.length,
      system_instruction_retained:responses.every(r=>r.context.some(m=>m.role==='system')),
      generation_settings:{...protocol.options,seed:job.seed},
      safety_configuration:{observable:false,state:'unknown',evidence_ref:null},
      transcript_integrity:{source_hash:'sha256:'+sha256(canonical(responses)),public_excerpt_available:false},
      public_scope:'not-public',literalization_challenge_present:false,
      registry:{release_id:bundle.release_id,release_sha256:expectedHash,protocol_sha256:bundle.study.sha256,
        worker_version:result.worker_version,phase:protocol.phase,citation:bundle.citation},
      eligibility:protocol.phase==='smoke'?'technical-only':'pending-human-context-review',
      notes:'Outside original v0.2 Gemini/Grok/Mistral corpus; exploratory extension only. Recovery probes are not literalization challenges. Provider safety state and pinned weights are unavailable.'
    };
    packets.push({manifest,responses});
  }
  return {release_id:bundle.release_id,release_sha256:expectedHash,inventory,packets};
}

// Extra checks implement existing protocol rules without revising its frozen schema.
export function validateScoring(annotation, response) {
  for (const key of ['self_description_present','first_person_claim_present','fiction_marker','literalization_challenge','challenge_outcome','evidence_status','confidence','alternative_explanations','evidence_limits'])
    requireThat(Object.hasOwn(annotation,key), 'Missing protocol field: '+key);
  requireThat(annotation.rubric_version === '0.2', 'Wrong rubric version');
  requireThat(annotation.response_id === response.response_id, 'Response ID mismatch');
  requireThat(['A','B','C','D','E'].includes(annotation.response_label), 'Human response label required');
  if (['C','D'].includes(annotation.response_label)) requireThat(Array.isArray(annotation.alternative_explanations) && annotation.alternative_explanations.some(x=>typeof x==='string'&&x.trim()), 'C/D require an alternative explanation');
  if (response.literalization_challenge === 'unavailable') {
    requireThat(annotation.response_label !== 'E', 'E requires an actual literalization challenge');
    requireThat(annotation.literalization_challenge === 'unavailable' && annotation.challenge_outcome === 'unavailable', 'Cannot invent a challenge');
  }
  return true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [source, expected] = process.argv.slice(2);
    requireThat(source && expected, 'Usage: node scripts/import_registry.mjs BUNDLE.json EXPECTED_SHA256');
    const bytes = readFileSync(source), converted = convert(bytes, expected);
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'private', 'registry');
    mkdirSync(root,{recursive:true,mode:0o700});
    const dest = join(root, converted.release_id);
    mkdirSync(dest,{mode:0o700}); // Refuse overwriting previous evidence/scoring work.
    writeFileSync(join(dest,'source.json'),bytes,{mode:0o600});
    writeFileSync(join(dest,'packet.json'),JSON.stringify(converted,null,2)+'\n',{mode:0o600});
    console.log(`Imported ${converted.packets.length} unscored run packet(s); ${converted.inventory.length} total run record(s).\nPrivate output: ${dest}`);
  } catch (error) { console.error(error.message); process.exitCode=1; }
}
