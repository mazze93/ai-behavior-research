import {boundedText,canonical,metrics,type Protocol,type Job,type RunRow,type StudyRow} from './core';
import {putEvidence,event} from './storage';
import {parseInference} from './inference';
type Message={role:'system'|'user'|'assistant';content:string};
export default {
 async queue(batch:MessageBatch<{run_id:string}>,env:RunnerEnv){
  for(const message of batch.messages){
   const id=message.body.run_id;
   const claim=await env.DB.prepare("UPDATE runs SET status='running',started_at=? WHERE id=? AND status='pending' RETURNING *").bind(new Date().toISOString(),id).first<RunRow>();
   if(!claim){message.ack();continue;}
   try{
    const study=await env.DB.prepare('SELECT * FROM studies WHERE id=?').bind(claim.study_id).first<StudyRow>();if(!study)throw new Error('Missing frozen study');
    const p:Protocol=JSON.parse(study.protocol),job:Job=JSON.parse(claim.job);
    if(p.gateway_id!==env.GATEWAY_ID||String(env.GATEWAY_ID)==='UNCONFIGURED')throw new Error('Gateway differs from frozen protocol');
    const history:Message[]=[{role:'system',content:job.condition.system}];
    const refs:{key:string;sha256:string;bytes:number}[]=[];
    const call=async(messages:Message[],label:string)=>{
     const input={messages,max_tokens:p.options.max_tokens,temperature:p.options.temperature,top_p:p.options.top_p,seed:job.seed,stream:false};
     const started_at=new Date().toISOString();
     const requestRef=await putEvidence(env.EVIDENCE,`runs/${id}/${label}-request.json`,{model:job.model,input,gateway:{id:env.GATEWAY_ID,skipCache:true,retries:0},started_at,worker_version:env.VERSION.id,protocol_sha256:study.sha256,model_revision:'Provider does not expose a pinned weights digest; alias may change',runtime:'Cloudflare Workers AI'});refs.push(requestRef);
     // Fixed model allowlist is checked by the web Worker before freezing.
     const response=await env.AI.run(job.model as keyof AiModels,input,{returnRawResponse:true,gateway:{id:env.GATEWAY_ID,skipCache:true,collectLog:true,retries:{maxAttempts:1},metadata:{study_id:claim.study_id,run_id:id,turn:label},requestTimeoutMs:90000},signal:AbortSignal.timeout(95000)});
     const raw=await boundedText(response.body);
     const headers=Object.fromEntries([...response.headers].filter(([k])=>['cf-aig-log-id','cf-aig-cache-status','cf-ray','content-type'].includes(k.toLowerCase())));
     const responseRef=await putEvidence(env.EVIDENCE,`runs/${id}/${label}-response.json`,{status:response.status,headers,body:raw,gateway_log_id:response.headers.get('cf-aig-log-id')??env.AI.aiGatewayLogId??null,received_at:new Date().toISOString()});refs.push(responseRef);
     if(!response.ok)throw new Error(`Inference HTTP ${response.status}; raw response preserved`);
     if((headers['cf-aig-cache-status']||'').toUpperCase()==='HIT')throw new Error('Cached response excluded from experiment');
     return {...parseInference(raw,p.options.max_tokens),artifact:responseRef};
    };
    const outputs=[];
    for(let i=0;i<job.condition.turns.length;i++){history.push({role:'user',content:job.condition.turns[i]});const response=await call(history,`turn${i+1}`);outputs.push(response);history.push({role:'assistant',content:response.text});}
    const recovery=[];
    for(const probe of p.recovery){const response=await call([...history,{role:'user',content:probe.prompt}],`recovery-${probe.id}`);recovery.push({id:probe.id,text:response.text,expected:probe.expected,exact:response.text.trim()===probe.expected,budget_limited:response.budget_limited});}
    const result={metrics:metrics(outputs[1].text),turn2_text:outputs[1].text,turn1_text:outputs[0].text,budget_limited:outputs[1].budget_limited,finish_reason:outputs[1].finish_reason,recovery,artifacts:refs,worker_version:env.VERSION.id,protocol_sha256:study.sha256};
    await env.DB.prepare("UPDATE runs SET status='complete',finished_at=?,result=? WHERE id=? AND status='running'").bind(new Date().toISOString(),canonical(result),id).run();await event(env.DB,'run_completed',{artifact_count:refs.length},claim.study_id,id);message.ack();
   }catch(error){
    const detail=error instanceof Error?error.message:'Execution failed';
    await env.DB.prepare("UPDATE runs SET status='failed',finished_at=?,error=? WHERE id=? AND status='running'").bind(new Date().toISOString(),detail,id).run();await event(env.DB,'run_failed',{error:detail},claim.study_id,id);message.ack();
   }
  }
 }
} satisfies ExportedHandler<RunnerEnv,{run_id:string}>;
