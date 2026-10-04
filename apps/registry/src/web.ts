import {authenticate,authenticateToken,session,type Actor} from './auth';
import {canonical,hash,validate,plan,invariant,summary,labelsValid,boundedText,type Protocol,type RunRow,type StudyRow} from './core';
import {putEvidence,event,dispatch} from './storage';
const json=(v:unknown,status=200)=>Response.json(v,{status});
const id=(prefix:string)=>prefix+'_'+crypto.randomUUID();
function annotationDesign(rows:Record<string,unknown>[]){
 const accounts=new Set(rows.map(r=>r.rater_id));
 const perRun=new Map<unknown,Set<unknown>>();
 for(const row of rows){const raters=perRun.get(row.run_id)||new Set();raters.add(row.rater_id);perRun.set(row.run_id,raters);}
 return {mode:accounts.size===0?'unannotated':accounts.size===1?'single_account':'multiple_accounts',submitted_rater_accounts:accounts.size,annotated_runs:perRun.size,runs_with_multiple_accounts:[...perRun.values()].filter(s=>s.size>1).length,human_independence:'unverified',repeated_rounds_supported:false,interpretation:'Account counts do not establish distinct people or independent ratings. A single account cannot provide inter-rater agreement. Delayed re-scoring measures within-rater consistency and requires separately recorded rounds.'};
}
async function body(req:Request){return JSON.parse(await boundedText(req.body,160000));}
function requireAdmin(actor:Actor|null){if(actor?.role!=='admin')throw json({error:'Owner authentication required'},401);}
async function studyDetail(env:WebEnv,studyId:string){const study=await env.DB.prepare('SELECT * FROM studies WHERE id=?').bind(studyId).first<StudyRow>();invariant(study,'Study not found');const runs=(await env.DB.prepare('SELECT * FROM runs WHERE study_id=? ORDER BY ordinal').bind(studyId).all<RunRow>()).results;const events=(await env.DB.prepare('SELECT * FROM events WHERE study_id=? ORDER BY at').bind(studyId).all()).results;return {study,runs,events,summary:summary(runs)};}
async function handle(req:Request,env:WebEnv,ctx:ExecutionContext):Promise<Response>{
 const url=new URL(req.url),path=url.pathname,method=req.method;
 if(method!=='GET'&&method!=='HEAD'&&req.headers.get('Origin')!==url.origin&&!req.headers.get('Authorization'))return json({error:'Same-origin request required'},403);
 if(path==='/api/health')return json({status:'ok',version:env.VERSION.id});
 if(path==='/api/releases'&&method==='GET')return json((await env.DB.prepare('SELECT * FROM releases ORDER BY created_at DESC').all()).results);
 const publicRelease=path.match(/^\/api\/releases\/(rel_[a-f0-9-]+)(?:\/(bundle|citation))?$/);
 if(publicRelease&&method==='GET'){
  const release=await env.DB.prepare('SELECT * FROM releases WHERE id=?').bind(publicRelease[1]).first<{artifact_key:string;citation:string}>();if(!release)return json({error:'Not found'},404);
  if(publicRelease[2]==='citation')return new Response(release.citation,{headers:{'Content-Type':'text/plain;charset=utf-8'}});
  const object=await env.EVIDENCE.get(release.artifact_key);if(!object)return json({error:'Archive unavailable'},503);
  return new Response(object.body,{headers:{'Content-Type':'application/json','Content-Disposition':publicRelease[2]==='bundle'?`attachment; filename="${publicRelease[1]}.json"`:'inline'}});
 }
 if(path==='/api/login'&&method==='POST'){
  const data=await body(req),actor=await authenticateToken(data.token,env);if(!actor)return json({error:'Invalid access token'},401);
  const response=json(actor);response.headers.set('Set-Cookie',`research_session=${await session(actor,env.SESSION_SECRET)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`);return response;
 }
 if(path==='/api/logout'&&method==='POST'){const r=json({ok:true});r.headers.set('Set-Cookie','research_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');return r;}
 const actor=await authenticate(req,env);
 if(path==='/api/me')return json(actor||{role:'public'});
 if(path==='/api/assignments'&&method==='GET'){
  if(!actor||actor.role!=='rater')return json({error:'Rater login required'},401);
  const rows=(await env.DB.prepare('SELECT a.id,r.result,n.id AS submitted FROM assignments a JOIN runs r ON r.id=a.run_id LEFT JOIN annotations n ON n.assignment_id=a.id WHERE a.rater_id=? ORDER BY a.id').bind(actor.id).all<{id:string;result:string;submitted:string|null}>()).results;
  return json(rows.map(r=>({id:r.id,text:JSON.parse(r.result).turn2_text,submitted:!!r.submitted})));
 }
 const annotation=path.match(/^\/api\/assignments\/(ass_[a-f0-9-]+)$/);
 if(annotation&&method==='POST'){
  if(!actor||actor.role!=='rater')return json({error:'Rater login required'},401);const a=await env.DB.prepare('SELECT id FROM assignments WHERE id=? AND rater_id=?').bind(annotation[1],actor.id).first();invariant(a,'Assignment not found');const data=await body(req);invariant(labelsValid(data),'Three 0–2 labels and an evidence excerpt are required');await env.DB.prepare('INSERT INTO annotations(id,assignment_id,labels,created_at) VALUES(?,?,?,?)').bind(id('ann'),annotation[1],canonical(data),new Date().toISOString()).run();return json({ok:true});
 }
 if(path.startsWith('/api/'))requireAdmin(actor);
 if(path==='/api/settings')return json({gateway:env.GATEWAY_ID,models:env.ALLOWED_MODELS.split(','),max_conversations:96,max_output_tokens:100000});
 if(path==='/api/studies'&&method==='GET')return json((await env.DB.prepare('SELECT id,title,sha256,created_at,parent_id FROM studies ORDER BY created_at DESC').all()).results);
 if(path==='/api/studies'&&method==='POST'){
  const data=await body(req),p:Protocol=data.protocol;validate(p,env.ALLOWED_MODELS.split(','));invariant(String(env.GATEWAY_ID)!=='UNCONFIGURED','Gateway has not been configured');p.gateway_id=env.GATEWAY_ID;
  const studyId=id('study'),text=canonical(p),sha=await hash(text),now=new Date().toISOString();
  if(data.parent_id)invariant(typeof data.amendment==='string'&&data.amendment.trim().length>0,'Amendments require a reason');
  await env.DB.prepare('INSERT INTO studies(id,title,protocol,sha256,created_at,source_version,parent_id,amendment) VALUES(?,?,?,?,?,?,?,?)').bind(studyId,p.title,text,sha,now,env.VERSION.id,data.parent_id||null,data.amendment||null).run();await event(env.DB,'protocol_frozen',{sha256:sha,phase:p.phase},studyId);return json({id:studyId,sha256:sha},201);
 }
 const studyPath=path.match(/^\/api\/studies\/(study_[a-f0-9-]+)(?:\/(launch|cancel|annotations|release))?$/);
 if(studyPath){const studyId=studyPath[1],action=studyPath[2];
  if(!action&&method==='GET')return json(await studyDetail(env,studyId));
  if(action==='launch'&&method==='POST'){
   const data=await body(req);invariant(data.confirm_execution===true,'Execution confirmation required');
   const {study,runs}=await studyDetail(env,studyId);invariant(!runs.length,'Study has already been launched');const p:Protocol=JSON.parse(study.protocol);validate(p,env.ALLOWED_MODELS.split(','));
   const jobs=plan(p);await env.DB.batch(jobs.map((job,i)=>env.DB.prepare('INSERT INTO runs(id,study_id,ordinal,job) VALUES(?,?,?,?)').bind(id('run'),studyId,i,canonical(job))));await event(env.DB,'study_launched',{conversations:jobs.length,maximum_output_tokens:jobs.length*5*p.options.max_tokens},studyId);ctx.waitUntil(dispatch(env));return json({planned:jobs.length},202);
  }
  if(action==='cancel'&&method==='POST'){await env.DB.prepare("UPDATE runs SET status='cancelled',finished_at=? WHERE study_id=? AND status='pending'").bind(new Date().toISOString(),studyId).run();await event(env.DB,'pending_runs_cancelled',{},studyId);return json({ok:true});}
  if(action==='annotations'&&method==='GET'){
   const annotations=(await env.DB.prepare('SELECT a.run_id,a.rater_id,n.labels,n.created_at FROM annotations n JOIN assignments a ON a.id=n.assignment_id JOIN runs r ON r.id=a.run_id WHERE r.study_id=?').bind(studyId).all()).results;
   const adjudications=(await env.DB.prepare('SELECT a.* FROM adjudications a JOIN runs r ON r.id=a.run_id WHERE r.study_id=?').bind(studyId).all()).results;return json({annotations,adjudications});
  }
  if(action==='release'&&method==='POST'){
   const data=await body(req);invariant(data.reviewed===true&&typeof data.author==='string'&&data.author.length>0&&data.author.length<200&&typeof data.license==='string'&&data.license.length>0&&data.license.length<200,'Review, author, and reuse terms required');
   const detail=await studyDetail(env,studyId);invariant(detail.runs.length>0&&!detail.runs.some(r=>['pending','running'].includes(r.status)),'Finish or cancel the study before publication');
   invariant(await hash(detail.study.protocol)===detail.study.sha256,'Frozen protocol checksum mismatch');
   const releaseId=id('rel'),created_at=new Date().toISOString(),artifacts=[];let artifactBytes=0;
   for(const run of detail.runs){const listing=await env.EVIDENCE.list({prefix:`runs/${run.id}/`,limit:20});invariant(!listing.truncated,'Unexpected excess artifacts');if(run.status==='complete')invariant(listing.objects.length===10,'Complete run must preserve five request/response pairs');for(const entry of listing.objects){artifactBytes+=entry.size;invariant(artifactBytes<=16000000,'Evidence bundle exceeds 16 MB release limit; retain the study and use an offline archive export');const obj=await env.EVIDENCE.get(entry.key);invariant(obj,'Missing evidence');const text=await boundedText(obj.body);invariant(await hash(text)===obj.customMetadata?.sha256,'Artifact checksum mismatch');artifacts.push({key:entry.key,sha256:obj.customMetadata.sha256,content:JSON.parse(text)});}}
   const annotations=(await env.DB.prepare('SELECT a.run_id,a.rater_id,n.labels,n.created_at FROM annotations n JOIN assignments a ON a.id=n.assignment_id JOIN runs r ON r.id=a.run_id WHERE r.study_id=?').bind(studyId).all()).results;
   const adjudications=(await env.DB.prepare('SELECT a.* FROM adjudications a JOIN runs r ON r.id=a.run_id WHERE r.study_id=?').bind(studyId).all()).results;
   const citation=`${data.author}. (${created_at.slice(0,4)}). ${detail.study.title}. Identity Dissolution Research Registry, release ${releaseId}. ${env.PUBLIC_ORIGIN}/releases/${releaseId}`;
   const bundle={schema_version:2,release_id:releaseId,created_at,author:data.author,license:data.license,citation,external_archive_doi:null,provenance_notice:'First-party server records with content hashes. Not independently notarized. Provider model weights and hardware are not disclosed. This is not an external preregistration or DOI deposit.',...detail,annotation_design:annotationDesign(annotations),annotations,adjudications,artifacts};
   const saved=await putEvidence(env.EVIDENCE,`releases/${releaseId}.json`,bundle);
   await env.DB.prepare('INSERT INTO releases(id,study_id,title,created_at,artifact_key,sha256,citation) VALUES(?,?,?,?,?,?,?)').bind(releaseId,studyId,detail.study.title,created_at,saved.key,saved.sha256,citation).run();await event(env.DB,'release_published',{release_id:releaseId,sha256:saved.sha256},studyId);return json({id:releaseId,sha256:saved.sha256,url:`${env.PUBLIC_ORIGIN}/releases/${releaseId}`},201);
  }
 }
 if(path==='/api/raters'&&method==='GET')return json((await env.DB.prepare('SELECT id,name,created_at FROM raters').all()).results);
 if(path==='/api/raters'&&method==='POST'){const data=await body(req);invariant(typeof data.name==='string'&&data.name.trim().length>0&&data.name.length<100,'Rater name required');const token=crypto.randomUUID()+crypto.randomUUID(),raterId=id('rater');await env.DB.prepare('INSERT INTO raters(id,name,token_hash,created_at) VALUES(?,?,?,?)').bind(raterId,data.name,await hash(token),new Date().toISOString()).run();return json({id:raterId,token,notice:'Shown once. Share privately with this rater.'},201);}
 if(path==='/api/assign'&&method==='POST'){
  const data=await body(req);
  invariant(Array.isArray(data.rater_ids)&&data.rater_ids.length>=1&&data.rater_ids.length<=100&&data.rater_ids.every((r:unknown)=>typeof r==='string')&&new Set(data.rater_ids).size===data.rater_ids.length,'Select one to 100 distinct rater accounts');
  const registered=new Set((await env.DB.prepare('SELECT id FROM raters').all<{id:string}>()).results.map(r=>r.id));
  invariant(data.rater_ids.every((r:string)=>registered.has(r)),'Every selected rater must exist');
  const {runs}=await studyDetail(env,data.study_id);
  const statements=runs.filter(r=>r.status==='complete').flatMap(r=>data.rater_ids.map((rater:string)=>env.DB.prepare('INSERT OR IGNORE INTO assignments(id,run_id,rater_id) VALUES(?,?,?)').bind(id('ass'),r.id,rater)));
  for(let i=0;i<statements.length;i+=80)await env.DB.batch(statements.slice(i,i+80));
  await event(env.DB,'annotations_assigned',{rater_accounts:data.rater_ids.length,assignments_requested:statements.length},data.study_id);
  return json({assignments_requested:statements.length,rater_accounts:data.rater_ids.length});
 }
 const runPath=path.match(/^\/api\/runs\/(run_[a-f0-9-]+)(?:\/(exclude|adjudicate))?$/);
 if(runPath){const r=await env.DB.prepare('SELECT * FROM runs WHERE id=?').bind(runPath[1]).first<RunRow>();invariant(r,'Run not found');if(!runPath[2]&&method==='GET'){const artifacts=[];for(const obj of (await env.EVIDENCE.list({prefix:`runs/${r.id}/`,limit:20})).objects){const o=await env.EVIDENCE.get(obj.key);if(o)artifacts.push({key:obj.key,sha256:o.customMetadata?.sha256,content:JSON.parse(await boundedText(o.body))});}return json({run:r,artifacts});}
  if(runPath[2]==='exclude'&&method==='POST'){const data=await body(req);invariant(typeof data.reason==='string'&&data.reason.trim().length>0&&data.reason.length<2000,'Reason required');await env.DB.prepare('UPDATE runs SET excluded_reason=? WHERE id=?').bind(data.reason,r.id).run();await event(env.DB,'run_excluded',{reason:data.reason},r.study_id,r.id);return json({ok:true});}
  if(runPath[2]==='adjudicate'&&method==='POST'){const data=await body(req);invariant(labelsValid(data)&&typeof data.rationale==='string'&&data.rationale.length>0&&data.rationale.length<4000,'Labels, evidence and rationale required');await env.DB.prepare('INSERT INTO adjudications(id,run_id,labels,rationale,created_at) VALUES(?,?,?,?,?)').bind(id('adj'),r.id,canonical(data),data.rationale,new Date().toISOString()).run();await event(env.DB,'adjudication_added',{},r.study_id,r.id);return json({ok:true});}
 }
 if(path.startsWith('/api/'))return json({error:'Not found'},404);
 if(path==='/')return env.ASSETS.fetch(new Request(new URL('/index.html',url),req));
 if(path.startsWith('/releases/'))return env.ASSETS.fetch(new Request(new URL('/release.html',url),req));
 return env.ASSETS.fetch(req);
}
export default {
 async fetch(req:Request,env:WebEnv,ctx:ExecutionContext){let response:Response;try{response=await handle(req,env,ctx);}catch(e){response=e instanceof Response?e:json({error:e instanceof Error?e.message:'Request failed'},400);}const r=new Response(response.body,response);r.headers.set('X-Content-Type-Options','nosniff');r.headers.set('Referrer-Policy','no-referrer');r.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");r.headers.set('Cache-Control','no-store');return r;},
 async scheduled(_event:ScheduledController,env:WebEnv){await env.DB.prepare("UPDATE runs SET status='interrupted',finished_at=?,error='Worker did not finish; inspect preserved call artifacts. No automatic inference retry.' WHERE status='running' AND started_at < ?").bind(new Date().toISOString(),new Date(Date.now()-20*60000).toISOString()).run();await dispatch(env);}
} satisfies ExportedHandler<WebEnv>;
