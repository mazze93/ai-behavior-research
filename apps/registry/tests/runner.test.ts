import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import runner from '../src/runner';
import {canonical,hash} from '../src/core';

test('queue claim, five independent calls, evidence preservation and failure handling',async()=>{
 const mf=new Miniflare(convertV4MiniflareOptions({name:'fixture',modules:true,script:'export default {fetch(){return new Response("fixture")}}',compatibilityDate:'2026-09-26',d1Databases:['DB'],r2Buckets:['EVIDENCE']}));
 try{
  const db=await mf.getD1Database('DB'),bucket=await mf.getR2Bucket('EVIDENCE');
  for(const file of ['0001_registry.sql','0002_preserve_audit.sql']){
   for(const sql of fs.readFileSync('migrations/'+file,'utf8').split('\n').filter(Boolean))await db.prepare(sql).run();
  }
  const p=JSON.parse(fs.readFileSync('public/smoke-template.json','utf8'));p.gateway_id='identity-research';
  const study=canonical(p);
  await db.prepare('INSERT INTO studies(id,title,protocol,sha256,created_at,source_version) VALUES(?,?,?,?,?,?)').bind('s','test',study,await hash(study),new Date().toISOString(),'test-version').run();
  const job=canonical({model:p.models[0],seed:11,condition:p.conditions[0]});
  await db.prepare('INSERT INTO runs(id,study_id,ordinal,job) VALUES(?,?,?,?)').bind('r','s',0,job).run();
  const calls:unknown[]=[];
  const env={DB:db,EVIDENCE:bucket,GATEWAY_ID:'identity-research',VERSION:{id:'test-version'},AI:{aiGatewayLogId:'fixture-log',run:async(_model:string,input: {messages:unknown[]},options: {gateway:{skipCache:boolean,retries:{maxAttempts:number}}})=>{
   calls.push(structuredClone(input));assert.equal(options.gateway.skipCache,true);assert.equal(options.gateway.retries.maxAttempts,1);
   return new Response(JSON.stringify({response:'Fixture output.',usage:{completion_tokens:3}}),{headers:{'cf-aig-cache-status':'MISS'}});
  }}};
  let acked=0;
  const deliver=(id:string)=>runner.queue({messages:[{body:{run_id:id},ack(){acked++;}}]} as MessageBatch<{run_id:string}>,env as unknown as RunnerEnv);
  await deliver('r');await deliver('r');
  assert.equal(calls.length,5);assert.equal(acked,2);
  const lengths=calls.map((x:any)=>x.messages.length);assert.deepEqual(lengths,[2,4,6,6,6]);
  assert.equal((await db.prepare('SELECT status FROM runs WHERE id=?').bind('r').first())?.status,'complete');
  assert.equal((await bucket.list({prefix:'runs/r/'})).objects.length,10);
  const response=JSON.parse(await (await bucket.get('runs/r/turn2-response.json'))!.text());assert.equal(response.gateway_log_id,'fixture-log');
  await assert.rejects(()=>db.prepare('UPDATE studies SET title=? WHERE id=?').bind('changed','s').run());
  await db.prepare('INSERT INTO runs(id,study_id,ordinal,job) VALUES(?,?,?,?)').bind('failure','s',1,job).run();
  env.AI.run=async()=>{throw Error('fixture transport failure');};
  await deliver('failure');await deliver('failure');
  const failed=await db.prepare('SELECT status,result FROM runs WHERE id=?').bind('failure').first();assert.equal(failed?.status,'failed');assert.equal(failed?.result,null);
  assert.equal((await bucket.list({prefix:'runs/failure/'})).objects.length,1);
 }finally{await mf.dispose();}
});
