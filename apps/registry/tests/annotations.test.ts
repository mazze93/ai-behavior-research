import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import web from '../src/web';
import {session,type Actor} from '../src/auth';
import {canonical,hash} from '../src/core';
import {putEvidence} from '../src/storage';

test('solo annotation lifecycle preserves access boundaries and records account counts',async t=>{
 const mf=new Miniflare(convertV4MiniflareOptions({name:'annotations',modules:true,script:'export default {fetch(){return new Response("fixture")}}',compatibilityDate:'2026-09-26',d1Databases:['DB'],r2Buckets:['EVIDENCE']}));
 try{
  const db=await mf.getD1Database('DB'),bucket=await mf.getR2Bucket('EVIDENCE');
  for(const file of ['0001_registry.sql','0002_preserve_audit.sql'])for(const sql of fs.readFileSync('migrations/'+file,'utf8').split('\n').filter(Boolean))await db.prepare(sql).run();
  const sid='study_aaaaaaaa',rid='run_aaaaaaaa',p=canonical(JSON.parse(fs.readFileSync('public/smoke-template.json','utf8')));
  await db.prepare('INSERT INTO studies(id,title,protocol,sha256,created_at,source_version) VALUES(?,?,?,?,?,?)').bind(sid,'test',p,await hash(p),'2026-10-04','fixture').run();
  await db.prepare('INSERT INTO runs(id,study_id,ordinal,job,status,result) VALUES(?,?,?,?,?,?)').bind(rid,sid,0,canonical({model:'fixture',condition:{id:'fixture'}}),'complete',canonical({turn2_text:'Fixture output',metrics:{repeat_4gram_fraction:0},recovery:[],budget_limited:false})).run();
  for(let i=0;i<10;i++)await putEvidence(bucket as unknown as R2Bucket,`runs/${rid}/${i}.json`,{fixture:i});
  for(const r of ['rater_a','rater_b'])await db.prepare('INSERT INTO raters VALUES(?,?,?,?)').bind(r,r,r,'2026-10-04').run();
  const env={DB:db,EVIDENCE:bucket,SESSION_SECRET:'fixture-only-secret',PUBLIC_ORIGIN:'https://fixture.example'} as unknown as WebEnv;
  const owner:Actor={role:'admin',id:'owner'},solo:Actor={role:'rater',id:'rater_a'};
  async function request(path:string,data?:unknown,actor:Actor|null=owner){const headers:Record<string,string>={Origin:env.PUBLIC_ORIGIN};if(actor)headers.Cookie='research_session='+await session(actor,env.SESSION_SECRET);return web.fetch(new Request(env.PUBLIC_ORIGIN+path,{method:data===undefined?'GET':'POST',headers,body:data===undefined?undefined:JSON.stringify(data)}),env,{} as ExecutionContext);}
  let soloReleaseId='',soloReleaseBytes='';
  const count=async()=>Number((await db.prepare('SELECT COUNT(*) AS n FROM assignments').first())!.n);
  await t.test('invalid selections write nothing',async()=>{
   for(const ids of [[],['rater_a','rater_a'],['rater_a','missing'],[null]]){assert.equal((await request('/api/assign',{study_id:sid,rater_ids:ids})).status,400);assert.equal(await count(),0);}
  });
  await t.test('only owner may assign',async()=>{for(const actor of [null,solo])assert.equal((await request('/api/assign',{study_id:sid,rater_ids:['rater_a']},actor)).status,401);});
  await t.test('one account may annotate without duplicate assignments',async()=>{
   for(let i=0;i<2;i++)assert.equal((await request('/api/assign',{study_id:sid,rater_ids:['rater_a']})).status,200);
   assert.equal(await count(),1);
  });
  await t.test('solo release is explicitly single account and no agreement claim',async()=>{
   const rows=await (await request('/api/assignments',undefined,solo)).json() as any[];assert.equal(rows.length,1);assert.deepEqual(Object.keys(rows[0]).sort(),['id','submitted','text']);
   const labels={experience_claim:0,role_boundary:0,lyrical_style:0,evidence:'Fixture output'};
   assert.equal((await request('/api/assignments/'+rows[0].id,labels,{role:'rater',id:'rater_b'})).status,400);
   assert.equal((await request('/api/assignments/'+rows[0].id,labels,solo)).status,200);
   assert.equal((await request('/api/assignments/'+rows[0].id,labels,solo)).status,400);
   const release=await request(`/api/studies/${sid}/release`,{reviewed:true,author:'Fixture',license:'test only'});assert.equal(release.status,201);
   const result=await release.json() as any;const bundle=await (await request('/api/releases/'+result.id,undefined,null)).json() as any;
   soloReleaseId=result.id;soloReleaseBytes=await (await request('/api/releases/'+result.id,undefined,null)).text();
   assert.equal(bundle.annotation_design.mode,'single_account');assert.equal(bundle.annotation_design.submitted_rater_accounts,1);assert.equal(bundle.annotation_design.runs_with_multiple_accounts,0);assert.equal(bundle.annotation_design.human_independence,'unverified');
  });
  await t.test('collaborators can submit later without changing the solo snapshot',async()=>{
   assert.equal((await request('/api/assign',{study_id:sid,rater_ids:['rater_a','rater_b']})).status,200);assert.equal(await count(),2);
   const collaborator:Actor={role:'rater',id:'rater_b'};
   const rows=await (await request('/api/assignments',undefined,collaborator)).json() as any[];
   assert.equal((await request('/api/assignments/'+rows[0].id,{experience_claim:1,role_boundary:0,lyrical_style:0,evidence:'Fixture output'},collaborator)).status,200);
   const released=await (await request(`/api/studies/${sid}/release`,{reviewed:true,author:'Fixture',license:'test only'})).json() as any;
   const bundle=await (await request('/api/releases/'+released.id,undefined,null)).json() as any;
   assert.equal(bundle.annotation_design.mode,'multiple_accounts');assert.equal(bundle.annotation_design.submitted_rater_accounts,2);assert.equal(bundle.annotation_design.runs_with_multiple_accounts,1);assert.equal(bundle.annotation_design.human_independence,'unverified');
   assert.equal(await (await request('/api/releases/'+soloReleaseId,undefined,null)).text(),soloReleaseBytes);
  });
 }finally{await mf.dispose();}
});
